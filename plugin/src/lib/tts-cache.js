/**
 * 语音缓存：同一段文字只合成一次。
 *
 * 阅读器用 MiniMax 的云端音色朗读，而学习者会把同一段文字听一遍又一遍：反复
 * 点播放、反复点单词、反复回到上一页。每一次点击都去合成一次，就是一次花钱
 * 的请求和一次等网络的往返。
 *
 * 宿主给回来的是自包含的 data: 音频链接（见 src/host/minimax.js），它不会过期，
 * 所以合成好的片段可以留下来：同一段文字、同一个音色、同一个语速，永远只合成
 * 一次。
 *
 * 缓存有两层：这一页的内存（这一页读过的片段）与浏览器的 IndexedDB（关掉页面
 * 之后还在）。内存优先，所以第二次点播放是瞬时的，连数据库都不用碰。
 *
 * 缓存永远不会打断朗读：数据库不可用（隐私模式、升级被占着）时，一切照旧，只
 * 是下一段要重新合成一次。
 */

import { getAudio, listAudio, saveAudio, deleteAudio } from './local-store.js';

/** The cache may hold this many bytes of audio. */
const DEFAULT_BUDGET_BYTES = 64 * 1024 * 1024;
/** The cache may hold this many clips. */
const DEFAULT_MAX_ENTRIES = 500;
/** The share of the budget that is left after a cleanup. */
const EVICTION_TARGET = 0.8;

/** The clips this page has already loaded. @type {Map<string, object>} */
const memory = new Map();
/** The clips that are on their way to the Host. @type {Map<string, {source: string, promise: Promise<object>}>} */
const pending = new Map();

/** How much the cache holds, as it was last counted. */
let stats = { loaded: false, clips: 0, bytes: 0 };
/** Bumped by a cleanup, so a request that was on its way does not fill the cache again. */
let epoch = 0;

/**
 * A short, stable hash of a string.
 *
 * It is not a cryptographic hash: it only has to keep the IndexedDB key short.
 * A collision cannot serve the wrong audio, because every record carries the
 * source it was made from, and that source is checked on the way out.
 *
 * @param {string} value - the string to hash.
 * @returns {string} the hash, in hex.
 */
function hashOf(value) {
  let first = 0x811c9dc5;
  let second = 0x01000193;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first ^= code;
    first = Math.imul(first, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
    second ^= second >>> 13;
  }
  return (first >>> 0).toString(16).padStart(8, '0')
    + (second >>> 0).toString(16).padStart(8, '0');
}

/**
 * The string one clip was made from: the voice, the speed and the text.
 *
 * It travels with the record, so a key that was made for another text can
 * never serve the wrong audio.
 *
 * @param {{ text?: string, voiceId?: string, rate?: number }} input
 * @returns {string} the source.
 */
function audioSource({ text, voiceId, rate } = {}) {
  const voice = voiceId === undefined || voiceId === null ? '' : String(voiceId);
  const speed = rate === undefined || rate === null ? '' : String(rate);
  const words = text === undefined || text === null ? '' : String(text);
  return `${voice}|${speed}|${words}`;
}

/**
 * The byte length of a string.
 * @param {string} value - the string.
 * @returns {number} the number of bytes.
 */
function byteLength(value) {
  const text = typeof value === 'string' ? value : '';
  if (typeof TextEncoder === 'function') return new TextEncoder().encode(text).length;
  return text.length;
}

/**
 * The byte budget of the cache.
 * @param {object} [options] - the call options.
 * @returns {number} the budget, in bytes.
 */
function budgetOf(options) {
  const value = Number(options?.budgetBytes);
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_BUDGET_BYTES;
}

/**
 * The number of clips the cache may hold.
 * @param {object} [options] - the call options.
 * @returns {number} the cap.
 */
function capOf(options) {
  const value = Number(options?.maxEntries);
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_MAX_ENTRIES;
}

/**
 * Every clip in the store, oldest first; null when the store is not there.
 * @returns {Promise<object[]|null>}
 */
async function readAll() {
  try {
    const clips = await listAudio();
    return Array.isArray(clips) ? clips : [];
  } catch {
    // The database is not available: there is nothing to list.
    return null;
  }
}

/**
 * Read one clip from the store.
 * @param {string} key - the clip.
 * @returns {Promise<object|undefined>}
 */
async function readStored(key) {
  try {
    return await getAudio(key);
  } catch {
    return undefined;
  }
}

/**
 * Count what the store holds, once per page.
 *
 * The count is kept in memory, so a write does not have to read the whole
 * store again just to find out whether the cache is full.
 *
 * @returns {Promise<void>}
 */
async function countOnce() {
  if (stats.loaded) return;
  const clips = await readAll();
  if (clips === null) return;
  stats.clips = clips.length;
  stats.bytes = clips.reduce((sum, clip) => sum + (clip?.bytes ?? 0), 0);
  stats.loaded = true;
}

/**
 * Write one clip to the store and keep the cache inside its bounds.
 *
 * A store that is not there is not a failure of the reading: the clip stays in
 * the memory of this page and the reading goes on.
 *
 * @param {object} record - the clip.
 * @param {object} [options] - the call options.
 * @returns {Promise<void>}
 */
async function writeStored(record, options) {
  try {
    await countOnce();
    await saveAudio(record);
    stats.clips += 1;
    stats.bytes += record.bytes;
  } catch {
    // The database is not available: the memory of this page still has it.
    return;
  }
  await evictIfNeeded(record.key, options);
}

/**
 * Make room when the cache grew past one of its bounds.
 *
 * The pass runs only when a bound was actually passed, so a normal write
 * never reads the whole store.
 *
 * @param {string} keepKey - the clip that was just made; it stays.
 * @param {object} [options] - the call options.
 * @returns {Promise<void>}
 */
async function evictIfNeeded(keepKey, options) {
  const budget = budgetOf(options);
  const cap = capOf(options);
  if (stats.bytes <= budget && stats.clips <= cap) return;

  const clips = await readAll();
  if (clips === null) return;
  let bytes = clips.reduce((sum, clip) => sum + (clip?.bytes ?? 0), 0);
  let count = clips.length;
  const target = budget * EVICTION_TARGET;
  for (const clip of clips) {
    if (bytes <= target && count <= cap) break;
    // The clip that was just made is the one being played: it stays.
    if (clip?.key === keepKey) continue;
    try {
      await deleteAudio(clip.key);
    } catch {
      continue;
    }
    memory.delete(clip.key);
    bytes -= clip?.bytes ?? 0;
    count -= 1;
  }
  stats.clips = count;
  stats.bytes = bytes;
}

/**
 * The key of one cached clip.
 *
 * The key is a hash, because the text of a paragraph is long and IndexedDB
 * keys are stored with every record. The full source string travels with the
 * record and is checked on the way out, so a collision cannot serve the wrong
 * audio.
 *
 * @param {{ text: string, voiceId?: string, rate?: number }} input
 * @returns {string} the key
 */
export function audioKey({ text, voiceId, rate } = {}) {
  return `au_${hashOf(audioSource({ text, voiceId, rate }))}`;
}

/**
 * Ask for the audio of a text — or take the one that was made before.
 *
 * @param {string} text - the text to speak.
 * @param {{ voiceId?: string, rate?: number, ask: Function, budgetBytes?: number, maxEntries?: number }} options
 *   - `ask` is the function that calls the Host; it must return
 *     `{ url, durationMs? }`. It is only called on a miss.
 *   - `budgetBytes` and `maxEntries` are the bounds of the cache; the default
 *     budget is 64 MiB and the default cap is 500 clips.
 * @returns {Promise<{ url: string, durationMs?: number, cached: boolean }>}
 *   `cached` is true when the clip came from the cache.
 */
export async function speakCached(text, options = {}) {
  const voiceId = options.voiceId;
  const rate = options.rate;
  const ask = options.ask;
  const source = audioSource({ text, voiceId, rate });
  const key = audioKey({ text, voiceId, rate });

  // The memory of this page first: a second press of Play is instant and
  // never touches the database.
  const memo = memory.get(key);
  if (memo !== undefined && memo.source === source && typeof memo.url === 'string' && memo.url !== '') {
    return { url: memo.url, durationMs: memo.durationMs, cached: true };
  }

  // Two clicks on the same text: the second one waits for the first.
  const running = pending.get(key);
  if (running !== undefined && running.source === source) {
    const made = await running.promise;
    return { url: made.record.url, durationMs: made.record.durationMs, cached: made.cached };
  }

  const started = epoch;
  const work = makeClip(text, { voiceId, rate, ask, source, key, started }, options);
  pending.set(key, { source, promise: work });
  try {
    const made = await work;
    return { url: made.record.url, durationMs: made.record.durationMs, cached: made.cached };
  } finally {
    pending.delete(key);
  }
}

/**
 * Get one clip: from the store, from the Host, or from both.
 *
 * @param {string} text - the text to speak.
 * @param {object} context - the request.
 * @param {string} context.key - the key of the clip.
 * @param {string} context.source - the string the clip is made from.
 * @param {Function} context.ask - the function that calls the Host.
 * @param {number} context.started - the epoch the request started in.
 * @param {object} options - the call options.
 * @returns {Promise<{record: object, cached: boolean}>} the clip and where it came from.
 */
async function makeClip(text, context, options) {
  const { key, source, ask, started } = context;

  // Then the store: the clip may have been made in an earlier session.
  const stored = await readStored(key);
  if (stored !== undefined && stored?.source === source && typeof stored.url === 'string' && stored.url !== '') {
    memory.set(key, stored);
    return { record: stored, cached: true };
  }

  // Then the Host: this clip is made once and only once.
  if (typeof ask !== 'function') throw new Error('当前环境没有语音合成通道');
  const result = await ask({ text, voiceId: context.voiceId, rate: context.rate });
  const url = typeof result?.url === 'string' ? result.url : '';
  if (url === '') throw new Error('云端没有返回音频');
  const durationMs = Number(result?.durationMs);
  const record = {
    key,
    source,
    url,
    durationMs: Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 0,
    createdAt: Date.now(),
    bytes: byteLength(url),
  };
  // A cache that was cleared while the clip was on its way does not fill up again.
  if (epoch === started) memory.set(key, record);
  await writeStored(record, options);
  return { record, cached: false };
}

/**
 * Make a clip ready before it is needed.
 *
 * A failure here is not a failure of the reading: the clip is simply made
 * again when the moment comes. So the error is swallowed.
 *
 * @param {string} text - the text to speak.
 * @param {{ voiceId?: string, rate?: number, ask: Function, budgetBytes?: number, maxEntries?: number }} options
 * @returns {Promise<void>}
 */
export async function warmAudio(text, options = {}) {
  try {
    await speakCached(text, options);
  } catch {
    // 预热失败不算朗读失败：到时候再合成一次就是了。
  }
}

/**
 * Forget every cached clip.
 * @returns {Promise<void>}
 */
export async function clearAudioCache() {
  epoch += 1;
  memory.clear();
  pending.clear();
  const clips = await readAll();
  if (clips !== null) {
    for (const clip of clips) {
      try {
        await deleteAudio(clip.key);
      } catch {
        // A clip that cannot be deleted stays in the store; the reading is
        // not affected by it.
      }
    }
  }
  stats = { loaded: true, clips: 0, bytes: 0 };
}

/**
 * How much of the cache is in use, for the settings page.
 * @returns {Promise<{ clips: number, bytes: number }>}
 */
export async function audioCacheUsage() {
  const clips = await readAll();
  if (clips === null) {
    const inMemory = [...memory.values()];
    return {
      clips: inMemory.length,
      bytes: inMemory.reduce((sum, clip) => sum + (clip?.bytes ?? 0), 0),
    };
  }
  const bytes = clips.reduce((sum, clip) => sum + (clip?.bytes ?? 0), 0);
  stats.clips = clips.length;
  stats.bytes = bytes;
  stats.loaded = true;
  return { clips: clips.length, bytes };
}

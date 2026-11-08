/**
 * Live dictation: the read-aloud compares what is being said with the text
 * while the learner is still speaking.
 *
 * The speech model answers in one piece, so "live" means: every few seconds the
 * audio recorded so far is transcribed again, and the words of the target text
 * are marked the moment they match. The final transcription on stop stays the
 * authoritative one — this loop exists to give the eye something to look at
 * while the voice is still going.
 *
 * Pure logic: the recorder, the Host call and the timers are injected.
 */
import { diffWords } from './engine/match.js';

/** How often the audio is re-transcribed while the learner speaks. */
export const PARTIAL_INTERVAL_MS = 1900;

/** Below this the clip is too short to say anything. */
export const MIN_PARTIAL_BYTES = 6000;

/** A sentence read aloud rarely passes this; the loop stops to bound the cost. */
export const MAX_PARTIAL_MS = 45000;

/**
 * @param {object} options - the call's dependencies.
 * @param {string} options.target - the text being read.
 * @param {() => {blob: Blob, mimeType: string}|null} options.snapshot - the audio so far.
 * @param {(payload: {audio: string, mimeType: string}) => Promise<{text?: string}>} options.askAsr
 * @param {(update: {text: string, aligned: object}) => void} options.onPartial - called per partial.
 * @param {number} [options.intervalMs] - how often to try.
 * @param {object} [options.timers] - { setInterval, clearInterval, now } for tests.
 * @param {(blob: Blob) => Promise<string>} options.toBase64 - base64 of the clip.
 * @returns {{start: () => void, stop: () => void, isRunning: () => boolean, tick: () => Promise<void>}}
 */
export function createLiveDictation(options = {}) {
  const target = String(options.target ?? '');
  const snapshot = typeof options.snapshot === 'function' ? options.snapshot : null;
  const askAsr = typeof options.askAsr === 'function' ? options.askAsr : null;
  const onPartial = typeof options.onPartial === 'function' ? options.onPartial : null;
  const toBase64 = typeof options.toBase64 === 'function' ? options.toBase64 : null;
  const intervalMs = Number.isFinite(options.intervalMs) && options.intervalMs > 0
    ? options.intervalMs
    : PARTIAL_INTERVAL_MS;
  const timers = options.timers ?? {
    setInterval: (fn, ms) => globalThis.setInterval(fn, ms),
    clearInterval: (handle) => globalThis.clearInterval(handle),
    now: () => Date.now(),
  };

  let handle = null;
  let closed = false;
  let inFlight = false;
  let startedAt = 0;

  /** @returns {boolean} whether the loop is running. */
  function isRunning() {
    return handle !== null;
  }

  /** Stop the loop: any partial still in flight is dropped. */
  function stop() {
    closed = true;
    if (handle !== null) {
      timers.clearInterval(handle);
      handle = null;
    }
    inFlight = false;
  }

  /** One round: transcribe what was said so far and mark the words. */
  async function tick() {
    if (closed || inFlight) return;
    if (snapshot === null || askAsr === null || toBase64 === null || onPartial === null) return;
    if (timers.now() - startedAt > MAX_PARTIAL_MS) {
      stop();
      return;
    }
    let clip;
    try {
      clip = snapshot();
    } catch {
      return;
    }
    if (clip === null || clip === undefined) return;
    const blob = clip.blob;
    if (blob === null || blob === undefined || Number(blob.size ?? 0) < MIN_PARTIAL_BYTES) return;
    inFlight = true;
    try {
      const audio = await toBase64(blob);
      if (closed) return;
      const result = await askAsr({ audio, mimeType: clip.mimeType ?? 'audio/webm' });
      if (closed) return;
      const text = typeof result?.text === 'string' ? result.text.trim() : '';
      if (text === '') return;
      onPartial({ text, aligned: diffWords(target, text) });
    } catch {
      // A partial is best effort: the next round tries again, and the final
      // transcription on stop is the one that decides.
    } finally {
      inFlight = false;
    }
  }

  /** Start the loop. */
  function start() {
    if (handle !== null) return;
    closed = false;
    startedAt = timers.now();
    handle = timers.setInterval(() => { void tick(); }, intervalMs);
  }

  return { start, stop, isRunning, tick };
}

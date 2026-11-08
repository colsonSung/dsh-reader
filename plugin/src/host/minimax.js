/**
 * Host half of the MiniMax channel.
 *
 * Two services are used: the chat model for word sheets, translations and
 * sentence breakdowns, and the text-to-speech model for the reading voice.
 *
 * THE KEY LADDER
 * --------------
 * The API key is not kept in one hand-maintained file any more. It is looked
 * for in four places, in this order:
 *
 *   1. the environment (`MINIMAX_API_KEY`);
 *   2. the private file outside the workspace (`~/.dsh/reader/minimax.key`);
 *   3. the Host credential store, by reference (`MINIMAX_API_KEY`,
 *      `MINIMAX_CN_API_KEY`, `MYMINIMAX_API_KEY`).
 *
 * Every candidate is checked with one cheap request before it is used, so an
 * invalid key is never cached. The key that passed the check is cached with its
 * source for ten minutes: the next request reads the cache instead of probing
 * again. A 401/403/2049 answer invalidates the key immediately and the ladder
 * moves on to the next source, which is what makes the channel heal itself when
 * a file holds a dead key but the Host credential store has a working one.
 *
 * THE COOLDOWN
 * ------------
 * A provider-side failure (auth, quota, rate limit, 5xx, timeout, model gone)
 * puts the channel into a five-minute cooldown. During the cooldown no request
 * goes to MiniMax any more; the AI assist falls back to the Host's own model
 * (see `src/host/ai.js`) and TTS/voices report an actionable Chinese error.
 *
 * Every dependency is injectable, so the behaviour can be tested without the
 * network: `env`, `keyFile`, `credentials`, `state`, `now`, `fetch` and
 * `timeoutMs`.
 */

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** The MiniMax API root that answers for this kind of key. */
export const BASE_URL = 'https://api.minimaxi.com/v1';

/**
 * The chat model used for the AI assist answers.
 *
 * `MiniMax-Text-01` was retired by the provider (a call with a valid key now
 * answers HTTP 404 `The model "MiniMax-Text-01" is no longer available`), so the
 * model is pinned to the one the Host itself runs (`GET /v1/models` lists
 * MiniMax-M3.1-Flash, MiniMax-M3, MiniMax-M2.7 …).
 */
export const CHAT_MODEL = 'MiniMax-M3.1-Flash';

/** The speech model used for the reading voice. */
export const TTS_MODEL = 'speech-02-hd';

/** The speech recognition model. */
import { convertAudioToWav } from './audio.js';

export const ASR_MODEL = 'asr-1.0';

/** The image model used for the book covers. */
export const IMAGE_MODEL = 'image-01';

/** The private file that may hold the API key. */
export const KEY_FILE = join(homedir(), '.dsh', 'reader', 'minimax.key');

/** Wall-clock budget for one MiniMax request. */
const DEFAULT_TIMEOUT_MS = 30000;

/** The endpoint used to check whether a key is alive: it costs no tokens. */
export const PROBE_PATH = '/get_voice';

/** Wall-clock budget for the key check; a dead key must not stall the status call. */
const PROBE_TIMEOUT_MS = 8000;

/** How long a key that passed the check stays cached. */
export const KEY_CACHE_TTL_MS = 10 * 60 * 1000;

/** How long the channel stays out of service after a provider failure. */
export const COOLDOWN_MS = 5 * 60 * 1000;

/** How long a failed key resolution is remembered, so a dead ladder is not re-walked on every request. */
const NEGATIVE_CACHE_TTL_MS = 60 * 1000;

/** The Host credential refs the ladder may read, in priority order. */
export const CREDENTIAL_REFS = Object.freeze(['MINIMAX_API_KEY', 'MINIMAX_CN_API_KEY', 'MYMINIMAX_API_KEY']);

/** Provider error codes that mean "the key itself is the problem". */
const KEY_ERROR_CODES = new Set(['MINIMAX_INVALID_KEY', 'MINIMAX_AUTH']);

/**
 * Build a channel failure.
 *
 * @param {string} message - the Chinese message the learner sees.
 * @param {object} [options] - the machine-readable facts.
 * @param {string} [options.code] - the machine readable code.
 * @param {number} [options.status] - the HTTP status, when the provider answered.
 * @param {number} [options.providerCode] - the MiniMax body-level status code.
 * @param {any} [options.cause] - the underlying failure, for diagnosis only.
 * @returns {Error} the failure.
 */
function channelError(message, options = {}) {
  const error = new Error(message);
  if (typeof options.code === 'string' && options.code !== '') error.code = options.code;
  if (typeof options.status === 'number' && Number.isFinite(options.status) && options.status > 0) error.status = options.status;
  if (typeof options.providerCode === 'number' && Number.isFinite(options.providerCode) && options.providerCode !== 0) {
    error.providerCode = options.providerCode;
  }
  if (options.cause !== undefined) error.cause = options.cause;
  return error;
}

/**
 * Whether a failure means the MiniMax key is invalid or rejected.
 *
 * @param {any} error - the thrown failure.
 * @returns {boolean} true when the key is the problem.
 */
export function isAuthError(error) {
  const code = typeof error?.code === 'string' ? error.code : '';
  if (KEY_ERROR_CODES.has(code)) return true;
  return error?.status === 401 || error?.status === 403;
}

/** The Chinese sentence for a rejected key. */
const KEY_REJECTED_MESSAGE = 'MiniMax API Key 无效或已失效，请更新 MINIMAX_API_KEY';

/**
 * Extract the MiniMax body-level status code, if any.
 *
 * Two shapes travel: `base_resp.status_code` on the legacy endpoints, and an
 * OpenAI-compatible `error.message` ending in `(2049)` on the newer ones.
 *
 * @param {any} payload - the parsed response body.
 * @returns {number} the code, or 0 when there is none.
 */
function providerStatusOf(payload) {
  const fromBase = Number(payload?.base_resp?.status_code);
  if (Number.isFinite(fromBase) && fromBase !== 0) return fromBase;
  const message = typeof payload?.error?.message === 'string' ? payload.error.message : '';
  const match = /\((\d{3,5})\)\s*$/.exec(message.trim());
  if (match !== null) {
    const fromMessage = Number(match[1]);
    if (Number.isFinite(fromMessage) && fromMessage !== 0) return fromMessage;
  }
  return 0;
}

/**
 * Turn a provider failure into a Chinese, actionable sentence plus a code.
 *
 * @param {object} facts - what the provider said.
 * @param {number} [facts.httpStatus] - the HTTP status, when there was one.
 * @param {string} [facts.type] - the OpenAI-compatible error type.
 * @param {number} [facts.providerCode] - the MiniMax body-level status code.
 * @param {string} [facts.providerMessage] - the provider's own words.
 * @returns {Error} the mapped failure.
 */
function mapProviderFailure(facts = {}) {
  const httpStatus = Number(facts.httpStatus ?? 0);
  const providerCode = Number(facts.providerCode ?? 0);
  const type = typeof facts.type === 'string' ? facts.type : '';
  const providerMessage = typeof facts.providerMessage === 'string' ? facts.providerMessage : '';
  const cause = providerMessage === '' ? undefined : new Error(providerMessage);

  const keyRejected =
    httpStatus === 401 || httpStatus === 403 ||
    type === 'authorized_error' || type === 'authentication_error' ||
    providerCode === 2049 || providerCode === 1004;
  if (keyRejected) {
    return channelError(`${KEY_REJECTED_MESSAGE}（HTTP ${httpStatus || 200}，miniMax code ${providerCode || 'n/a'}）`, {
      code: 'MINIMAX_INVALID_KEY',
      status: httpStatus,
      providerCode,
      cause,
    });
  }

  const quota =
    httpStatus === 402 ||
    type === 'insufficient_balance_error' ||
    providerCode === 2067 || providerCode === 1008;
  if (quota) {
    return channelError('MiniMax 账户额度已用尽（Token Plan 用量上限或余额不足），请充值或更换 API Key', {
      code: 'MINIMAX_QUOTA',
      status: httpStatus,
      providerCode,
      cause,
    });
  }

  const rateLimited =
    httpStatus === 429 ||
    type === 'rate_limit_error' ||
    providerCode === 1002;
  if (rateLimited) {
    return channelError('MiniMax 请求频率超限，请稍后再试', {
      code: 'MINIMAX_RATE_LIMIT',
      status: httpStatus,
      providerCode,
      cause,
    });
  }

  const modelGone =
    providerCode === 2069 ||
    (httpStatus === 404 && /model/i.test(providerMessage));
  if (modelGone) {
    return channelError(`MiniMax 模型不可用（模型名可能已下线）：${providerMessage || 'model not available'}，请更新模型配置`, {
      code: 'MINIMAX_MODEL_UNAVAILABLE',
      status: httpStatus,
      providerCode,
      cause,
    });
  }

  if (httpStatus >= 500 || providerCode === 1013) {
    return channelError(`MiniMax 服务暂时不可用（HTTP ${httpStatus || 200}），请稍后再试`, {
      code: 'MINIMAX_UNAVAILABLE',
      status: httpStatus,
      providerCode,
      cause,
    });
  }

  if (httpStatus === 404) {
    return channelError('MiniMax 接口地址不可用（HTTP 404），请检查 API 版本配置', {
      code: 'MINIMAX_REQUEST_REJECTED',
      status: httpStatus,
      providerCode,
      cause,
    });
  }

  const suffix = providerMessage === '' ? '' : `：${providerMessage.slice(0, 160)}`;
  return channelError(`MiniMax 请求被拒绝（HTTP ${httpStatus || 200}，miniMax code ${providerCode || 'n/a'}）${suffix}`, {
    code: 'MINIMAX_REQUEST_REJECTED',
    status: httpStatus,
    providerCode,
    cause,
  });
}

/**
 * The key candidates in priority order.
 *
 * @param {object} [deps] - the injected dependencies.
 * @param {Record<string, string|undefined>} [deps.env] - the environment.
 * @param {string} [deps.keyFile] - an explicit key file path.
 * @param {{resolve?: Function}} [deps.credentials] - the Host credential service.
 * @returns {Promise<{id: string, key: string, source: 'env'|'file'|'credentials', ref?: string}[]>} the candidates.
 */
async function collectKeyCandidates(deps = {}) {
  const candidates = [];
  const seen = new Set();
  /**
   * @param {{id: string, key: string, source: 'env'|'file'|'credentials', ref?: string}} candidate
   */
  const push = (candidate) => {
    if (candidate.key === '' || seen.has(candidate.key)) return;
    seen.add(candidate.key);
    candidates.push(candidate);
  };

  const env = deps.env ?? process.env;
  const fromEnv = typeof env?.MINIMAX_API_KEY === 'string' ? env.MINIMAX_API_KEY.trim() : '';
  if (fromEnv !== '') push({ id: 'env', key: fromEnv, source: 'env' });

  const file = keyFilePath(deps);
  try {
    if (existsSync(file)) {
      const fromFile = readFileSync(file, 'utf8').trim();
      if (fromFile !== '') push({ id: `file:${file}`, key: fromFile, source: 'file' });
    }
  } catch {
    // The file cannot be read: the ladder continues with the credentials.
  }

  const store = deps.credentials;
  if (store !== null && store !== undefined && typeof store.resolve === 'function') {
    for (const ref of deps.credentialRefs ?? CREDENTIAL_REFS) {
      let value = '';
      try {
        const hit = await store.resolve(ref);
        value = typeof hit?.value === 'string' ? hit.value.trim() : '';
      } catch {
        // A ref that cannot be resolved is simply not a candidate.
        continue;
      }
      if (value !== '') push({ id: `credentials:${ref}`, key: value, source: 'credentials', ref });
    }
  }
  return candidates;
}

/**
 * The private file that may hold the key.
 *
 * @param {object} [deps] - the injected dependencies.
 * @returns {string} the path.
 */
function keyFilePath(deps = {}) {
  return deps.keyFile
    ?? process.env.READER_MINIMAX_KEY_FILE
    ?? process.env.ENGLISH_READER_MINIMAX_KEY_FILE
    ?? KEY_FILE;
}

/**
 * Read the API key, synchronously, from the environment or the private file.
 *
 * This is the cheap half of the ladder; it cannot see the Host credential
 * store, which is asynchronous. `resolveKey` is the half every request uses.
 *
 * @param {{ env?: Record<string, string|undefined>, keyFile?: string }} [options]
 * @returns {string|null} the key, or null when none is configured.
 */
export function readApiKey(options = {}) {
  const env = options.env ?? process.env;
  const fromEnv = typeof env.MINIMAX_API_KEY === 'string' ? env.MINIMAX_API_KEY.trim() : '';
  if (fromEnv !== '') return fromEnv;
  try {
    const file = keyFilePath(options);
    if (existsSync(file)) {
      const content = readFileSync(file, 'utf8').trim();
      if (content !== '') return content;
    }
  } catch {
    // No key file, or it cannot be read: the channel stays off.
  }
  return null;
}

/**
 * The per-process channel state.
 *
 * The cache lives here so the next request can read what this one learned: a
 * verified key, its source, the instant it expires, and the cooldown after a
 * provider failure.
 *
 * @returns {object} a fresh state; tests keep their own, production uses the module's.
 */
export function createChannelState() {
  return {
    key: null,
    expiresAt: 0,
    retryAt: 0,
    reason: '',
    resolveError: null,
    cooldownUntil: 0,
    lastFailure: null,
  };
}

/** The state the running Host uses. */
const DEFAULT_STATE = createChannelState();

/**
 * Pick the state this call belongs to.
 * @param {object} [deps] - the injected dependencies.
 * @returns {object} the state.
 */
function stateOf(deps = {}) {
  return deps.state ?? DEFAULT_STATE;
}

/**
 * The current wall clock.
 * @param {object} [deps] - the injected dependencies.
 * @returns {number} milliseconds since the epoch.
 */
function clock(deps = {}) {
  const value = typeof deps.now === 'function' ? Number(deps.now()) : Date.now();
  return Number.isFinite(value) ? value : Date.now();
}

/**
 * How long the channel stays out of service after a failure.
 * @param {object} [deps] - the injected dependencies.
 * @returns {number} milliseconds.
 */
function cooldownMs(deps = {}) {
  return Number.isFinite(deps.cooldownMs) && deps.cooldownMs >= 0 ? deps.cooldownMs : COOLDOWN_MS;
}

/**
 * Whether the channel is cooling down right now.
 * @param {object} [deps] - the injected dependencies.
 * @returns {boolean} true while MiniMax must be skipped.
 */
export function coolingDown(deps = {}) {
  return stateOf(deps).cooldownUntil > clock(deps);
}

/**
 * How long until the channel may be tried again.
 * @param {object} [deps] - the injected dependencies.
 * @returns {number} milliseconds; 0 when the channel is not cooling.
 */
export function cooldownRemainingMs(deps = {}) {
  const left = stateOf(deps).cooldownUntil - clock(deps);
  return left > 0 ? left : 0;
}

/**
 * The failure the channel remembers, for the status call and the fallback
 * message. It never carries the key.
 *
 * @param {object} [deps] - the injected dependencies.
 * @returns {{source: string, configured: boolean, coolingDown: boolean, cooldownRemainingMs: number, lastFailure: object|null, reason?: string, chatModel: string, ttsModel: string}} the public view.
 */
export function channelState(deps = {}) {
  const state = stateOf(deps);
  const left = cooldownRemainingMs(deps);
  const view = {
    source: typeof state.key?.source === 'string' ? state.key.source : 'none',
    configured: state.key !== null && state.key !== undefined,
    coolingDown: left > 0,
    cooldownRemainingMs: left,
    lastFailure: state.lastFailure === null || state.lastFailure === undefined ? null : { ...state.lastFailure },
    chatModel: CHAT_MODEL,
    ttsModel: TTS_MODEL,
  };
  if (typeof state.reason === 'string' && state.reason !== '') view.reason = state.reason;
  return view;
}

/**
 * Forget everything the channel learned. Used by tests, and after a key file
 * is rewritten by the user.
 * @param {object} [deps] - the injected dependencies.
 */
export function resetChannel(deps = {}) {
  const state = stateOf(deps);
  state.key = null;
  state.expiresAt = 0;
  state.retryAt = 0;
  state.reason = '';
  state.resolveError = null;
  state.cooldownUntil = 0;
  state.lastFailure = null;
}

/**
 * Put the channel into cooldown after a provider failure.
 * @param {object} deps - the injected dependencies.
 * @param {any} error - the failure that caused it.
 */
function markCooldown(deps, error) {
  const state = stateOf(deps);
  state.cooldownUntil = clock(deps) + cooldownMs(deps);
  state.lastFailure = {
    code: typeof error?.code === 'string' ? error.code : '',
    status: typeof error?.status === 'number' ? error.status : 0,
    providerCode: typeof error?.providerCode === 'number' ? error.providerCode : 0,
    message: typeof error?.message === 'string' ? error.message.slice(0, 300) : String(error ?? ''),
    at: clock(deps),
  };
}

/**
 * The failure a call gets while the channel is cooling down.
 * @param {object} deps - the injected dependencies.
 * @returns {Error} the failure.
 */
function cooldownError(deps) {
  const state = stateOf(deps);
  const seconds = Math.max(1, Math.round(cooldownRemainingMs(deps) / 1000));
  const last = state.lastFailure;
  const reason = last !== null && last !== undefined && typeof last.message === 'string' && last.message !== ''
    ? `，最近失败：${last.message}`
    : '';
  return channelError(`MiniMax 通道临时不可用${reason}；约 ${seconds} 秒后自动恢复`, {
    code: 'MINIMAX_COOLDOWN',
    status: typeof last?.status === 'number' ? last.status : 0,
    providerCode: typeof last?.providerCode === 'number' ? last.providerCode : 0,
  });
}

/**
 * The last failed resolution, or a generic "no key" failure.
 * @param {object} deps - the injected dependencies.
 * @returns {Error} the failure.
 */
function resolutionError(deps) {
  const state = stateOf(deps);
  if (state.resolveError instanceof Error) return state.resolveError;
  return channelError(
    state.reason !== '' ? state.reason : '未配置可用的 MiniMax API Key（环境变量、密钥文件、宿主凭据均未提供）',
    { code: 'NO_KEY' },
  );
}

/**
 * Perform one raw request with one key.
 *
 * @param {string} path - the path below the API root.
 * @param {object|FormData} body - the request body.
 * @param {object} [deps] - the injected dependencies.
 * @param {string} key - the API key to use.
 * @param {object} [options] - the request options.
 * @param {number} [options.timeoutMs] - the wall-clock budget.
 * @param {AbortSignal} [options.signal] - the caller's cancellation signal.
 * @param {boolean} [options.raw] - send the body as it is instead of JSON.
 * @returns {Promise<object>} the parsed answer.
 */
async function rawRequest(path, body, deps = {}, key, options = {}) {
  const doFetch = deps.fetch ?? globalThis.fetch;
  if (typeof doFetch !== 'function') {
    throw channelError('当前环境不支持 fetch', { code: 'NO_FETCH' });
  }
  const timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
    ? options.timeoutMs
    : (Number.isFinite(deps.timeoutMs) && deps.timeoutMs > 0 ? deps.timeoutMs : DEFAULT_TIMEOUT_MS);
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const caller = options.signal ?? deps.signal;
  const onCallerAbort = () => {
    controller.abort();
  };
  const callerIsAbortable = caller !== null && caller !== undefined && typeof caller.addEventListener === 'function';
  if (callerIsAbortable) {
    if (caller.aborted === true) controller.abort();
    else caller.addEventListener('abort', onCallerAbort, { once: true });
  }
  try {
    const headers = { Authorization: `Bearer ${key}` };
    let payloadBody;
    if (options.raw === true) {
      payloadBody = body;
    } else {
      headers['Content-Type'] = 'application/json';
      payloadBody = JSON.stringify(body);
    }
    if (options.headers !== null && options.headers !== undefined) Object.assign(headers, options.headers);

    let response;
    try {
      response = await doFetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers,
        body: payloadBody,
        signal: controller.signal,
      });
    } catch (error) {
      if (callerIsAbortable && caller.aborted === true) {
        const aborted = channelError('AI 请求已取消', { code: 'ABORTED', cause: error });
        aborted.name = 'AbortError';
        throw aborted;
      }
      if (timedOut === true || error?.name === 'AbortError') {
        throw channelError(`MiniMax 请求超时（${Math.max(1, Math.round(timeoutMs / 1000))} 秒），请稍后再试`, {
          code: 'MINIMAX_TIMEOUT',
          cause: error,
        });
      }
      throw channelError(`无法连接 MiniMax 服务：${error instanceof Error ? error.message : String(error)}`, {
        code: 'MINIMAX_NETWORK',
        cause: error,
      });
    }

    const payload = await response.json().catch(() => ({}));
    if (response.ok !== true) {
      const status = typeof response.status === 'number' ? response.status : 0;
      throw mapProviderFailure({
        httpStatus: status,
        type: typeof payload?.error?.type === 'string' ? payload.error.type : '',
        providerCode: providerStatusOf(payload),
        providerMessage: typeof payload?.error?.message === 'string' ? payload.error.message : '',
      });
    }
    const baseResp = payload?.base_resp;
    if (baseResp !== null && baseResp !== undefined && Number(baseResp.status_code) !== 0) {
      throw mapProviderFailure({
        providerCode: Number(baseResp.status_code),
        providerMessage: typeof baseResp.status_msg === 'string' ? baseResp.status_msg : '',
      });
    }
    return payload;
  } finally {
    clearTimeout(timer);
    if (callerIsAbortable && typeof caller.removeEventListener === 'function') {
      caller.removeEventListener('abort', onCallerAbort);
    }
  }
}

/**
 * Check one key with one cheap request.
 *
 * `/get_voice` answers with the (free) system voice list; a dead key gets
 * `base_resp.status_code = 2049` there, so the check costs nothing.
 *
 * @param {string} key - the candidate key.
 * @param {object} deps - the injected dependencies.
 */
async function probeKey(key, deps) {
  const timeoutMs = Number.isFinite(deps.probeTimeoutMs) && deps.probeTimeoutMs > 0 ? deps.probeTimeoutMs : PROBE_TIMEOUT_MS;
  await rawRequest(PROBE_PATH, { voice_type: 'all' }, deps, key, { timeoutMs });
}

/**
 * Resolve a key: the cached one when it is still fresh, otherwise the first
 * candidate that passes the cheap check.
 *
 * @param {object} [deps] - the injected dependencies.
 * @param {Set<string>} [excluded] - candidate ids already known to be dead.
 * @returns {Promise<{id: string, key: string, source: 'env'|'file'|'credentials', ref?: string}|null>} the key, or null.
 */
export async function resolveKey(deps = {}, excluded = new Set()) {
  const state = stateOf(deps);
  const at = clock(deps);
  const cached = state.key;
  if (cached !== null && cached !== undefined && state.expiresAt > at && !excluded.has(cached.id)) return cached;
  if (excluded.size === 0 && state.retryAt > at) return null;

  const candidates = await collectKeyCandidates(deps);
  let lastAuthError = null;
  let lastError = null;
  for (const candidate of candidates) {
    if (excluded.has(candidate.id)) continue;
    try {
      await probeKey(candidate.key, deps);
      state.key = candidate;
      state.expiresAt = at + (Number.isFinite(deps.keyTtlMs) && deps.keyTtlMs > 0 ? deps.keyTtlMs : KEY_CACHE_TTL_MS);
      state.retryAt = 0;
      state.reason = '';
      state.resolveError = null;
      return candidate;
    } catch (error) {
      lastError = error;
      if (isAuthError(error)) {
        lastAuthError = error;
        continue;
      }
      // The provider is unreachable, or it refuses the probe for a reason that
      // is not about the key: trying the remaining keys would only repeat it.
      break;
    }
  }

  state.key = null;
  state.expiresAt = 0;
  state.retryAt = at + NEGATIVE_CACHE_TTL_MS;
  if (lastAuthError !== null) {
    state.reason = `MiniMax Key 不可用：${lastAuthError.message}`;
    state.resolveError = lastAuthError;
  } else if (lastError !== null) {
    state.reason = `MiniMax 服务不可达：${lastError.message}`;
    state.resolveError = lastError;
  } else {
    state.reason = '未配置可用的 MiniMax API Key（环境变量、密钥文件、宿主凭据均未提供）';
    state.resolveError = channelError(state.reason, { code: 'NO_KEY' });
  }
  return null;
}

/**
 * Drop a key that the provider rejected.
 * @param {object} deps - the injected dependencies.
 * @param {{id: string, key: string}} hit - the key that failed.
 */
function invalidateKey(deps, hit) {
  const state = stateOf(deps);
  if (state.key !== null && state.key !== undefined && (state.key.id === hit.id || state.key.key === hit.key)) {
    state.key = null;
    state.expiresAt = 0;
  }
  state.retryAt = 0;
}

/**
 * Perform one request with the key ladder, key rotation and the cooldown.
 *
 * @param {string} path - the path below the API root.
 * @param {object|FormData} body - the request body.
 * @param {object} [deps] - the injected dependencies.
 * @param {object} [options] - the request options.
 * @returns {Promise<object>} the parsed answer.
 */
async function perform(path, body, deps = {}, options = {}) {
  // A caller may hand over one explicit key (tests, or a one-off probe). That
  // key is used as it is: it is not part of the ladder, so the ladder's
  // cooldown does not apply to it.
  const hasExplicitKey = Object.prototype.hasOwnProperty.call(deps, 'key');
  const explicitKey = hasExplicitKey && typeof deps.key === 'string' ? deps.key.trim() : '';
  if (hasExplicitKey && explicitKey === '') {
    throw channelError('未配置 MiniMax API Key', { code: 'NO_KEY' });
  }
  if (!hasExplicitKey && coolingDown(deps)) throw cooldownError(deps);
  const excluded = new Set();
  let lastAuthError = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const resolved = hasExplicitKey
      ? { id: 'explicit', key: explicitKey, source: 'env' }
      : await resolveKey(deps, excluded);
    if (resolved === null) {
      if (lastAuthError !== null) {
        // Every source the ladder had was rejected at runtime: this is a
        // provider failure, so the channel cools down and the request fails
        // with the mapped key error.
        markCooldown(deps, lastAuthError);
        throw lastAuthError;
      }
      throw resolutionError(deps);
    }
    try {
      return await rawRequest(path, body, deps, resolved.key, options);
    } catch (error) {
      if (!hasExplicitKey && isAuthError(error)) {
        // The provider rejected the key: drop it and try the next source in the
        // ladder within the same request.
        invalidateKey(deps, resolved);
        excluded.add(resolved.id);
        lastAuthError = error;
        continue;
      }
      markCooldown(deps, error);
      throw error;
    }
  }

  const error = lastAuthError ?? channelError(KEY_REJECTED_MESSAGE, { code: 'MINIMAX_INVALID_KEY' });
  markCooldown(deps, error);
  throw error;
}

/**
 * Ask the MiniMax chat model for one completion.
 *
 * @param {object} options - the call parameters.
 * @param {string} options.system - the system prompt.
 * @param {string} options.user - the user prompt.
 * @param {number} [options.maxTokens] - the token cap.
 * @param {number} [options.temperature] - the sampling temperature.
 * @param {object} [deps] - the injected dependencies.
 * @returns {Promise<string>} the model's answer.
 */
export async function chat({ system, user, maxTokens = 800, temperature = 0.2 }, deps = {}) {
  const payload = await perform('/chat/completions', {
    model: deps.model ?? CHAT_MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature,
    max_completion_tokens: maxTokens,
  }, deps, {
    timeoutMs: Number.isFinite(deps.timeoutMs) && deps.timeoutMs > 0 ? deps.timeoutMs : undefined,
    signal: deps.signal,
  });
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.trim() === '') {
    throw channelError('MiniMax 没有返回内容', { code: 'EMPTY_ANSWER' });
  }
  return content;
}

/**
 * Synthesise speech with the MiniMax text-to-speech model.
 *
 * @param {object} options - the call parameters.
 * @param {string} options.text - the text to read.
 * @param {string} [options.voiceId] - the MiniMax voice id.
 * @param {number} [options.speed] - the speaking rate, 0.5 to 2.
 * @param {object} [deps] - the injected dependencies.
 * @returns {Promise<{url: string, durationMs: number, format: string}>} the audio.
 */
export async function tts({ text, voiceId, speed = 1 }, deps = {}) {
  const content = typeof text === 'string' ? text.trim() : '';
  if (content === '') throw channelError('没有要朗读的内容', { code: 'EMPTY_TEXT' });
  const rate = Math.min(2, Math.max(0.5, Number(speed) || 1));
  const payload = await perform('/t2a_v2', {
    model: deps.model ?? TTS_MODEL,
    text: content,
    stream: false,
    voice_setting: {
      voice_id: voiceId ?? 'English_Graceful_Lady',
      speed: rate,
      vol: 1,
      pitch: 0,
    },
    audio_setting: {
      sample_rate: 32000,
      bitrate: 128000,
      format: 'mp3',
      channel: 1,
    },
  }, deps);
  const hex = payload?.data?.audio;
  if (typeof hex !== 'string' || hex === '') {
    throw channelError('MiniMax 没有返回音频', { code: 'EMPTY_AUDIO' });
  }
  const format = payload?.extra_info?.audio_format ?? 'mp3';
  const durationMs = Number(payload?.extra_info?.audio_length ?? 0);
  return {
    url: `data:audio/${format};base64,${Buffer.from(hex, 'hex').toString('base64')}`,
    durationMs: Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 0,
    format,
  };
}

/**
 * Build the prompt for a book cover.
 *
 * The image models render short titles well but garble long ones, so only the
 * title is given to them and the author is kept out of the picture.
 *
 * @param {string} title - the book title.
 * @returns {string} the prompt.
 */
export function coverPrompt(title) {
  const name = String(title ?? '').trim();
  return [
    `A modern book cover for the title "${name}".`,
    'Editorial design, strong typographic hierarchy, generous margins,',
    'a restrained palette of two or three colours on textured paper,',
    'one clear geometric or photographic focal point.',
    `The only text on the cover is the title "${name}", set cleanly and spelled exactly as written.`,
    'No author name, no publisher, no other text, no barcode.',
  ].join(' ');
}

/**
 * Generate a cover image with the MiniMax image model.
 *
 * @param {object} options - the call parameters.
 * @param {string} options.title - the book title.
 * @param {object} [deps] - the injected dependencies.
 * @returns {Promise<{url: string, width: number, height: number}>} the cover.
 */
export async function coverImage({ title }, deps = {}) {
  const prompt = deps.prompt ?? coverPrompt(title);
  const timeoutMs = Number.isFinite(deps.timeoutMs) && deps.timeoutMs > 0 ? deps.timeoutMs : 120000;
  const payload = await perform('/image_generation', {
    model: deps.model ?? IMAGE_MODEL,
    prompt,
    aspect_ratio: '2:3',
    n: 1,
    response_format: 'url',
  }, deps, { timeoutMs });
  const urls = payload?.data?.image_urls ?? payload?.data?.images ?? [];
  const imageUrl = Array.isArray(urls) ? urls[0] : null;
  if (typeof imageUrl !== 'string' || imageUrl === '') {
    throw channelError('MiniMax 没有返回图片', { code: 'EMPTY_IMAGE' });
  }
  // The picture is fetched here and handed over as a data URL, so the shelf
  // never depends on the network.
  const doFetch = deps.fetch ?? globalThis.fetch;
  if (typeof doFetch !== 'function') throw channelError('当前环境不支持 fetch', { code: 'NO_FETCH' });
  let picture;
  try {
    picture = await doFetch(imageUrl);
  } catch (error) {
    throw channelError('封面图片下载失败', { code: 'IMAGE_DOWNLOAD_FAILED', cause: error });
  }
  if (picture?.ok !== true) {
    throw channelError('封面图片下载失败', { code: 'IMAGE_DOWNLOAD_FAILED', status: picture?.status ?? 0 });
  }
  const bytes = Buffer.from(await picture.arrayBuffer());
  const type = picture.headers?.get?.('content-type') ?? 'image/jpeg';
  return {
    url: `data:${type};base64,${bytes.toString('base64')}`,
    width: Number(payload?.data?.width ?? 0),
    height: Number(payload?.data?.height ?? 0),
  };
}

/**
 * Transcribe a recording with the MiniMax speech recognition model.
 *
 * The browser's own recognition needs a Google speech service, which the
 * desktop app does not have; this is the replacement.
 *
 * @param {object} options - the call parameters.
 * @param {string} options.audio - the recording, base64 encoded.
 * @param {string} [options.mimeType] - the audio mime type.
 * @param {object} [deps] - the injected dependencies.
 * @returns {Promise<{text: string, duration: number}>} the transcript.
 */
export async function asr({ audio, mimeType = 'audio/webm' }, deps = {}) {
  const bytes = Buffer.from(String(audio ?? ''), 'base64');
  if (bytes.length === 0) throw channelError('没有可识别的音频', { code: 'EMPTY_AUDIO' });
  // Browser MediaRecorder emits WebM; MiniMax rejects that container. The
  // Host owns the conversion so every browser gets the same WAV request.
  const converter = deps.convertAudio ?? convertAudioToWav;
  const converted = await converter(bytes, { filename: 'recording.webm' });
  const form = new FormData();
  form.append('file', new Blob([converted.bytes], { type: 'audio/wav' }), converted.filename);
  form.append('model', deps.model ?? ASR_MODEL);
  const payload = await perform('/speech_to_text', form, deps, { raw: true });
  return {
    text: typeof payload?.text === 'string' ? payload.text : '',
    duration: Number(payload?.duration ?? 0),
  };
}

/** 汉字。 */
const HAN = /\p{Script=Han}/u;

/** 纯 ASCII 的 id 与名字。 */
const ASCII_ONLY = /^[\x20-\x7e]*$/;

/**
 * MiniMax 把语言写在音色 id 的开头，客户端靠它判断音色说的是哪种语言。
 *
 * 取自真实的 system_voice 列表：中文音色是 `Chinese (Mandarin)_…` 与
 * `Cantonese_…`，英文是 `English_…`；没有前缀的中文音色（少女音色、聪明男童 …）
 * 只能从名字里的汉字认出来。
 */
const VOICE_LANGUAGE_PREFIXES = [
  ['chinese (mandarin)', 'zh-CN'],
  ['cantonese', 'zh-HK'],
  ['english', 'en-US'],
  ['japanese', 'ja-JP'],
  ['korean', 'ko-KR'],
  ['portuguese', 'pt-BR'],
  ['spanish', 'es-ES'],
  ['french', 'fr-FR'],
  ['italian', 'it-IT'],
  ['german', 'de-DE'],
  ['russian', 'ru-RU'],
  ['indonesian', 'id-ID'],
  ['dutch', 'nl-NL'],
  ['arabic', 'ar-SA'],
  ['turkish', 'tr-TR'],
  ['ukrainian', 'uk-UA'],
  ['vietnamese', 'vi-VN'],
];

/**
 * 判断一个云端音色的 id 里有没有写着语言的前缀。
 *
 * @param {string} id - the voice id.
 * @returns {boolean} true when the id names its language.
 */
function hasLanguagePrefix(id) {
  const value = String(id ?? '').trim().toLowerCase();
  return VOICE_LANGUAGE_PREFIXES.some(([prefix]) => value.startsWith(prefix));
}

/**
 * 判断一个云端音色说的是哪种语言。
 *
 * MiniMax 的 system_voice 不带语言字段，只能从 id 前缀判断；没有前缀的中文
 * 音色由名字里的汉字认出；介绍里写明口音的（美式、英式）算英文；剩下既没有
 * 语言前缀、名字也不是中文的，是英文角色音色（Santa Claus、Grinch …）。
 *
 * @param {{voice_id?: string, voice_name?: string, description?: string[]}} voice
 * @returns {string} the BCP 47 tag; an empty string when it stays unknown.
 */
export function detectVoiceLanguage(voice) {
  const id = String(voice?.voice_id ?? '').trim().toLowerCase();
  const name = String(voice?.voice_name ?? '');
  const description = Array.isArray(voice?.description)
    ? voice.description.join(' ')
    : String(voice?.description ?? '');
  for (const [prefix, lang] of VOICE_LANGUAGE_PREFIXES) {
    if (id.startsWith(prefix)) return lang;
  }
  if (HAN.test(name)) return 'zh-CN';
  if (/英语|英文|美式|英式/.test(description)) return 'en-US';
  if (id !== '' && ASCII_ONLY.test(id) && ASCII_ONLY.test(name)) return 'en-US';
  return '';
}

/**
 * List the system voices of the MiniMax account.
 *
 * 中英文音色都给出：中文书要用中文音色，英文书要用英文音色，客户端按
 * 返回的 lang 自己筛。认不出语言的音色也留下，免得无声消失。
 *
 * @param {object} [deps] - the injected dependencies.
 * @param {'zh'|'en'} [deps.language] - the language the client reads in; the
 *   voices of that language come first, so a client that takes the first voice
 *   of the list gets a voice that speaks the book.
 * @returns {Promise<{id: string, name: string, lang: string}[]>} the voices.
 */
export async function voices(deps = {}) {
  const payload = await perform('/get_voice', { voice_type: 'all' }, deps);
  const list = Array.isArray(payload?.system_voice) ? payload.system_voice : [];
  const wanted = deps.language === 'zh' ? 'zh' : 'en';
  const decorated = list
    .filter((voice) => voice && typeof voice.voice_id === 'string')
    .map((voice, index) => ({
      index,
      explicit: hasLanguagePrefix(voice.voice_id),
      voice: {
        id: voice.voice_id,
        name: String(voice.voice_name ?? voice.voice_id),
        lang: detectVoiceLanguage(voice),
      },
    }))
    // 只给中英文音色；认不出语言的音色也留着，它不是别的语言
    .filter((entry) => {
      const lang = entry.voice.lang;
      return lang === '' || lang.startsWith('zh') || lang.startsWith('en');
    });
  // 客户端习惯取列表里的第一个音色：先排本书的语言，再排 id 里写明语言的
  // 音色（旁白型的），角色音色（少女音色、Santa Claus …）排在后面
  decorated.sort((a, b) => {
    const group =
      Number(b.voice.lang.startsWith(wanted)) - Number(a.voice.lang.startsWith(wanted));
    if (group !== 0) return group;
    if (a.explicit !== b.explicit) return a.explicit ? -1 : 1;
    return a.index - b.index;
  });
  return decorated.map((entry) => entry.voice);
}

/**
 * Whether MiniMax can answer right now: a key that passed the cheap check and
 * a channel that is not cooling down.
 *
 * @param {object} [deps] - the injected dependencies.
 * @returns {Promise<boolean>} true when the channel is usable.
 */
export async function isAvailable(deps = {}) {
  if (coolingDown(deps)) return false;
  const resolved = await resolveKey(deps);
  return resolved !== null;
}

/**
 * The real health of the channel, for the client's status call.
 *
 * `minimax` is true only when a key passed the cheap check and the channel is
 * not cooling down; `source` says where that key came from. The fields the
 * client already reads (`minimax`, `chatModel`, `ttsModel`) keep their names.
 *
 * @param {object} [deps] - the injected dependencies.
 * @returns {Promise<{minimax: boolean, source: 'env'|'file'|'credentials'|'none', reason?: string, chatModel: string, ttsModel: string}>} the status.
 */
export async function status(deps = {}) {
  const state = stateOf(deps);
  const cooling = coolingDown(deps);
  let resolved = null;
  let reason = '';
  if (cooling) {
    resolved = state.key;
    const seconds = Math.max(1, Math.round(cooldownRemainingMs(deps) / 1000));
    reason = `MiniMax 通道冷却中（约 ${seconds} 秒后自动重试）`;
    if (typeof state.lastFailure?.message === 'string' && state.lastFailure.message !== '') {
      reason += `：${state.lastFailure.message}`;
    }
  } else {
    resolved = await resolveKey(deps);
    if (resolved === null) reason = state.reason !== '' ? state.reason : '未配置可用的 MiniMax API Key';
  }
  const result = {
    minimax: resolved !== null && resolved !== undefined && !cooling,
    source: typeof resolved?.source === 'string' ? resolved.source : 'none',
    chatModel: CHAT_MODEL,
    ttsModel: TTS_MODEL,
  };
  if (reason !== '') result.reason = reason;
  return result;
}

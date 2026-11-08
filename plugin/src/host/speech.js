/**
 * The reading voice, local first.
 *
 * A local speech model (Kokoro, 82M parameters, ONNX-free PyTorch build) runs
 * on this machine: no key, no network, and the voice is a studio-quality
 * American or British narrator. The cloud model is the fallback, not the other
 * way round — it is only asked when the local service cannot answer.
 *
 * The local model is optional: when its environment is missing, this module
 * simply reports that, and the cloud answers. Nothing is downloaded at runtime.
 *
 * Configuration: `~/.dsh/reader/tts.json`, all fields optional:
 *
 *   {
 *     "local": {
 *       "enabled": true,
 *       "python": "~/.dsh/reader/tts-venv/bin/python",
 *       "script": "…/src/host/kokoro-server.py",
 *       "voices": { "en-US": "af_heart", "en-GB": "bf_emma" },
 *       "idleSeconds": 600
 *     }
 *   }
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Where the optional configuration lives. */
export const CONFIG_FILE = join(homedir(), '.dsh', 'reader', 'tts.json');

/** The local voice of each accent. */
export const DEFAULT_LOCAL_VOICES = { 'en-US': 'af_heart', 'en-GB': 'bf_emma' };

/** The script that runs the local model. */
const SERVER_SCRIPT = fileURLToPath(new URL('./kokoro-server.py', import.meta.url));

/** How long the local service may take to load before the cloud takes over. */
const START_TIMEOUT_MS = 120000;

/** The generated WAV header is 44 bytes; 24 kHz, mono, 16-bit. */
const WAV_BYTES_PER_SECOND = 24000 * 2;

/**
 * Read the optional configuration.
 *
 * @returns {{ local: object }} the configuration, defaults merged.
 */
export function loadConfig() {
  const defaults = {
    local: {
      enabled: true,
      python: join(homedir(), '.dsh', 'reader', 'tts-venv', 'bin', 'python'),
      script: SERVER_SCRIPT,
      voices: { ...DEFAULT_LOCAL_VOICES },
      idleSeconds: 600,
    },
  };
  try {
    const raw = readFileSync(CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const local = { ...defaults.local, ...(parsed?.local ?? {}) };
    local.voices = { ...defaults.local.voices, ...(parsed?.local?.voices ?? {}) };
    return { local };
  } catch {
    return defaults;
  }
}

/** The local speech service, when it is running. */
let service = null;

/** The last reason the local service was not usable. */
let lastFailure = '';

/**
 * Whether the local model is installed on this machine.
 *
 * @param {object} local - the local section of the configuration.
 * @returns {boolean}
 */
export function localInstalled(local = loadConfig().local) {
  if (local.enabled === false) return false;
  if (!existsSync(local.python)) return false;
  if (!existsSync(local.script)) return false;
  return true;
}

/**
 * The local voice for an accent.
 *
 * @param {string} accent - 'en-US' or 'en-GB'.
 * @returns {string} the Kokoro voice name.
 */
export function localVoiceFor(accent, local = loadConfig().local) {
  return local.voices?.[accent === 'en-GB' ? 'en-GB' : 'en-US'] ?? DEFAULT_LOCAL_VOICES['en-US'];
}

/**
 * Whether a voice id belongs to the local model.
 *
 * @param {string} voiceId
 * @returns {boolean}
 */
export function isLocalVoice(voiceId) {
  const id = String(voiceId ?? '');
  if (id === '') return false;
  const normal = id.replace(/^local:/, '');
  return /^(af|am|bf|bm|ef|em|ff|if|im|jf|jm|pf|pm|zf|zm)_/i.test(normal);
}

/**
 * Start the local speech service, once.
 *
 * @param {object} [options] - the injected dependencies.
 * @param {object} [options.local] - the local configuration.
 * @param {Function} [options.spawnImpl] - the spawn function (tests).
 * @param {Function} [options.fetchImpl] - the fetch function (tests).
 * @param {number} [options.timeoutMs] - how long to wait for the service.
 * @returns {Promise<{proc: object, port: number}|null>}
 */
export async function ensureService(options = {}) {
  if (service !== null) return service;
  const local = options.local ?? loadConfig().local;
  if (!localInstalled(local)) {
    lastFailure = '本机语音模型未安装';
    return null;
  }
  const spawnImpl = options.spawnImpl ?? spawn;
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : START_TIMEOUT_MS;
  let proc;
  try {
    proc = spawnImpl(local.python, [local.script, '--port', '0', '--idle-seconds', String(local.idleSeconds ?? 600)], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });
  } catch (error) {
    lastFailure = error instanceof Error ? error.message : '本机语音模型启动失败';
    return null;
  }
  const port = await new Promise((resolve) => {
    let settled = false;
    let buffer = '';
    let timer = null;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      if (timer !== null) clearTimeout(timer);
      resolve(value);
    };
    proc.stdout?.on('data', (chunk) => {
      buffer += String(chunk);
      const match = /port=(\d+)/.exec(buffer);
      if (match !== null) finish(Number(match[1]));
    });
    proc.stderr?.on('data', (chunk) => {
      const text = String(chunk).trim();
      if (text !== '') lastFailure = text.slice(0, 300);
    });
    proc.on('exit', () => finish(null));
    timer = setTimeout(() => finish(null), timeoutMs);
    // The wait must not keep the process awake on its own: the host is long
    // lived, a test process is not.
    timer.unref?.();
  });
  if (port === null) {
    try { proc.kill(); } catch { /* already gone */ }
    return null;
  }
  // The port is printed before the model is loaded; the health check is what
  // proves the service answers.
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetchImpl('http://127.0.0.1:' + port + '/health');
      if (response.ok) {
        const body = await response.json();
        if (body?.ok === true) {
          service = { proc, port, voices: body.voices ?? {} };
          lastFailure = '';
          return service;
        }
      }
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  try { proc.kill(); } catch { /* already gone */ }
  lastFailure = '本机语音模型启动超时';
  return null;
}

/** Stop the local service (tests and status refreshes). */
export function stopService() {
  if (service === null) return;
  try { service.proc.kill(); } catch { /* already gone */ }
  service = null;
}

/**
 * Synthesize with the local model.
 *
 * @param {{text: string, voice?: string, speed?: number}} request
 * @param {object} [options] - the injected dependencies.
 * @returns {Promise<{url: string, durationMs: number, format: string, provider: 'local', voice: string}>}
 */
export async function synthesizeLocal(request, options = {}) {
  const running = await ensureService(options);
  if (running === null) throw new Error(lastFailure || '本机语音模型不可用');
  const fetchImpl = options.fetchImpl ?? fetch;
  const voice = String(request.voice ?? localVoiceFor('en-US', options.local ?? loadConfig().local));
  const body = JSON.stringify({ text: request.text, voice, speed: request.speed ?? 1 });
  const response = await fetchImpl('http://127.0.0.1:' + running.port + '/synthesize', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error('本机语音合成失败（HTTP ' + response.status + '）' + (detail === '' ? '' : '：' + detail.slice(0, 200)));
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length <= 44) throw new Error('本机语音没有返回音频');
  const seconds = (bytes.length - 44) / WAV_BYTES_PER_SECOND;
  return {
    url: 'data:audio/wav;base64,' + bytes.toString('base64'),
    durationMs: Math.round(seconds * 1000),
    format: 'wav',
    provider: 'local',
    voice,
  };
}

/**
 * The status of the local voice, for the client.
 *
 * @param {object} [options] - the injected dependencies.
 * @returns {{ available: boolean, provider: string, reason?: string, voices: object }}
 */
export function localStatus(options = {}) {
  const local = options.local ?? loadConfig().local;
  const installed = localInstalled(local);
  const available = installed && (service !== null || lastFailure === '');
  return {
    available,
    provider: 'kokoro',
    installed,
    running: service !== null,
    voices: { ...DEFAULT_LOCAL_VOICES, ...(local.voices ?? {}) },
    reason: available ? undefined : (lastFailure || (installed ? '' : '本机语音模型未安装')),
  };
}

/**
 * The one call the route uses: local first, cloud when the local model is not
 * there or cannot answer.
 *
 * @param {{text: string, voiceId?: string, speed?: number, accent?: string}} request
 * @param {object} deps - { local, cloud } injectables.
 * @returns {Promise<object>} the audio plus which provider spoke.
 */
export async function speak(request, deps = {}) {
  const text = String(request?.text ?? '').trim();
  if (text === '') throw new Error('没有要朗读的内容');
  const accent = request?.accent === 'en-GB' ? 'en-GB' : 'en-US';
  const voiceId = String(request?.voiceId ?? '');
  const wantsLocal = deps.localEnabled !== false && (voiceId === '' || isLocalVoice(voiceId));
  if (wantsLocal) {
    try {
      const audio = await synthesizeLocal({
        text,
        voice: isLocalVoice(voiceId) ? voiceId.replace(/^local:/, '') : localVoiceFor(accent, deps.local),
        speed: request?.speed,
      }, deps);
      return { ...audio, providerName: 'Kokoro（本机）' };
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
      if (typeof deps.onLocalFailure === 'function') deps.onLocalFailure(lastFailure);
    }
  }
  const cloud = deps.cloud;
  if (typeof cloud !== 'function') throw new Error('云端语音不可用');
  // A local voice name means nothing to the cloud model: it would reject it.
  const cloudVoice = isLocalVoice(voiceId) ? undefined : (voiceId === '' ? undefined : voiceId);
  const audio = await cloud({ text, voiceId: cloudVoice, speed: request?.speed });
  return { ...audio, provider: 'cloud', providerName: 'MiniMax（云端）' };
}

/**
 * The MiniMax host channel: the key ladder, the cache, the cooldown, the chat,
 * the speech and the voices.
 *
 * Every request is served by a fake fetch, so the tests never reach the
 * network. Every test owns a fresh channel state, so no test can inherit the
 * cache or the cooldown of another one.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  CHAT_MODEL,
  CREDENTIAL_REFS,
  KEY_CACHE_TTL_MS,
  TTS_MODEL,
  asr,
  channelState,
  chat,
  coolingDown,
  coverImage,
  coverPrompt,
  createChannelState,
  isAuthError,
  isAvailable,
  readApiKey,
  resetChannel,
  resolveKey,
  status,
  tts,
  voices,
} from '../src/host/minimax.js';

/** The MiniMax answer to the free key check. */
const VOICES_BODY = {
  system_voice: [
    { voice_id: 'English_Graceful_Lady', voice_name: 'Graceful Lady' },
    { voice_id: 'female-shaonv', voice_name: '少女音色' },
  ],
};

/**
 * A fetch response carrying one JSON body.
 * @param {object} body - the body.
 * @param {number} [status] - the HTTP status.
 * @returns {object} the fake response.
 */
function jsonResponse(body, status = 200) {
  return {
    ok: status < 400,
    status,
    json: async () => body,
  };
}

/**
 * A recorded fake fetch. The handler decides the answer by URL, which is what
 * lets one test cover the key check followed by the real request.
 * @param {Function} handler - `(url, init) => response`.
 * @param {Array} [calls] - the call log.
 * @returns {Function} the fake fetch.
 */
function routedFetch(handler, calls = []) {
  const fn = async (url, init) => {
    calls.push({ url: String(url), init });
    return handler(String(url), init);
  };
  return fn;
}

/**
 * A fetch that answers every request with the same JSON body.
 * @param {object} payload - the body.
 * @param {object} [options] - the options.
 * @param {number} [options.status] - the HTTP status.
 * @returns {Function} the fake fetch.
 */
function fakeFetch(payload, options = {}) {
  return routedFetch(() => jsonResponse(payload, options.status ?? 200));
}

/**
 * An environment with no MiniMax key in it.
 * @returns {{MINIMAX_API_KEY?: string}} the environment.
 */
function emptyEnv() {
  return {};
}

/**
 * A key file path that does not exist, so the file step of the ladder is empty.
 * @returns {string} the path.
 */
function missingKeyFile() {
  return join(tmpdir(), 'reader-tests', 'missing-minimax.key');
}

/**
 * A fake Host credential store over a plain map.
 * @param {Record<string, string>} values - the ref values.
 * @param {Array} [calls] - the resolve log.
 * @returns {{resolve: Function}} the store.
 */
function fakeCredentials(values, calls = []) {
  return {
    async resolve(ref) {
      calls.push(ref);
      return Object.prototype.hasOwnProperty.call(values, ref) ? { value: values[ref], source: 'store' } : undefined;
    },
  };
}

/**
 * A fake clock the tests move by hand.
 * @param {number} [start] - the starting instant.
 * @returns {{now: Function, advance: Function}} the clock.
 */
function fakeClock(start = 1_000_000) {
  let at = start;
  return {
    now: () => at,
    advance: (ms) => {
      at += ms;
    },
  };
}

test('readApiKey 优先用环境变量，其次用私有文件', () => {
  assert.equal(readApiKey({ env: { MINIMAX_API_KEY: ' sk-from-env ' } }), 'sk-from-env');
  assert.equal(readApiKey({ env: {}, keyFile: missingKeyFile() }), null);

  const dir = mkdtempSync(join(tmpdir(), 'reader-key-'));
  const file = join(dir, 'minimax.key');
  writeFileSync(file, '  sk-from-file\n', 'utf8');
  assert.equal(readApiKey({ env: {}, keyFile: file }), 'sk-from-file');
});

test('status 在没有任何 Key 时如实返回 none，且不发请求', async () => {
  let calls = 0;
  const value = await status({
    env: emptyEnv(),
    keyFile: missingKeyFile(),
    state: createChannelState(),
    fetch: async () => {
      calls += 1;
      throw new Error('不该发请求');
    },
  });
  assert.equal(value.minimax, false);
  assert.equal(value.source, 'none');
  assert.equal(value.chatModel, CHAT_MODEL);
  assert.equal(value.ttsModel, TTS_MODEL);
  assert.match(value.reason, /未配置/);
  assert.equal(calls, 0);
});

test('status 校验环境变量里的 Key，并返回来源与真实型号', async () => {
  const calls = [];
  const value = await status({
    env: { MINIMAX_API_KEY: ' env-key ' },
    keyFile: missingKeyFile(),
    state: createChannelState(),
    fetch: routedFetch(() => jsonResponse(VOICES_BODY), calls),
  });
  assert.equal(value.minimax, true);
  assert.equal(value.source, 'env');
  assert.equal(value.reason, undefined);
  assert.equal(value.chatModel, 'MiniMax-M3.1-Flash');
  assert.equal(value.ttsModel, 'speech-02-hd');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/get_voice$/);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer env-key');
});

test('status 跳过无效的文件 Key，改用宿主 credentials 的可用 Key', async () => {
  const calls = [];
  const credentialsCalls = [];
  const dir = mkdtempSync(join(tmpdir(), 'reader-key-'));
  const file = join(dir, 'minimax.key');
  writeFileSync(file, 'sk-dead-file', 'utf8');
  const fetch = routedFetch((url, init) => {
    if (init.headers.Authorization === 'Bearer sk-dead-file') {
      // 失效 Key：HTTP 200 + body 级 2049，和线上实测一致
      return jsonResponse({ base_resp: { status_code: 2049, status_msg: 'invalid api key' } });
    }
    return jsonResponse(VOICES_BODY);
  }, calls);

  const value = await status({
    env: emptyEnv(),
    keyFile: file,
    credentials: fakeCredentials({ MINIMAX_CN_API_KEY: 'sk-cp-good' }, credentialsCalls),
    state: createChannelState(),
    fetch,
  });

  assert.equal(value.minimax, true);
  assert.equal(value.source, 'credentials');
  assert.equal(calls.length, 2);
  assert.deepEqual(
    calls.map((call) => call.init.headers.Authorization),
    ['Bearer sk-dead-file', 'Bearer sk-cp-good'],
  );
  // The ladder asks the refs in the documented order; a missing ref is not a candidate.
  assert.deepEqual(credentialsCalls, [...CREDENTIAL_REFS]);
});

test('候选 Key 只探活一次：后续请求读缓存，TTL 到期才重新探活', async () => {
  const calls = [];
  const clock = fakeClock();
  const state = createChannelState();
  const deps = {
    env: emptyEnv(),
    keyFile: missingKeyFile(),
    credentials: fakeCredentials({ MINIMAX_CN_API_KEY: 'sk-cp-good' }),
    state,
    now: clock.now,
    fetch: routedFetch((url) => {
      if (url.endsWith('/chat/completions')) return jsonResponse({ choices: [{ message: { content: '{"text":"你好"}' } }] });
      return jsonResponse(VOICES_BODY);
    }, calls),
  };

  assert.equal(await chat({ system: 's', user: 'u' }, deps), '{"text":"你好"}');
  // One key check + one chat request.
  assert.equal(calls.length, 2);
  assert.equal(channelState(deps).source, 'credentials');

  assert.equal(await chat({ system: 's', user: 'u' }, deps), '{"text":"你好"}');
  // The cached key is read: only the chat request travels.
  assert.equal(calls.length, 3);

  clock.advance(KEY_CACHE_TTL_MS + 1);
  assert.equal(await chat({ system: 's', user: 'u' }, deps), '{"text":"你好"}');
  // Expired cache: the key is checked again, then the chat request.
  assert.equal(calls.length, 5);
});

test('缓存里记的是 Key 的来源，status 能读出来', async () => {
  const state = createChannelState();
  const deps = {
    env: emptyEnv(),
    keyFile: missingKeyFile(),
    credentials: fakeCredentials({ MINIMAX_CN_API_KEY: 'sk-cp-good' }),
    state,
    fetch: routedFetch(() => jsonResponse(VOICES_BODY)),
  };
  assert.equal(await isAvailable(deps), true);
  assert.deepEqual(
    { source: channelState(deps).source, configured: channelState(deps).configured },
    { source: 'credentials', configured: true },
  );
  const value = await status(deps);
  assert.equal(value.minimax, true);
  assert.equal(value.source, 'credentials');
});

test('运行期 401 立即作废该 Key，并在同一请求里换下一个来源', async () => {
  const calls = [];
  const clock = fakeClock();
  const state = createChannelState();
  const fetch = routedFetch((url, init) => {
    const key = init.headers.Authorization;
    if (url.endsWith('/get_voice')) return jsonResponse(VOICES_BODY);
    // The env key passed the probe but is rejected by the real endpoint:
    // this is the "provider changed its mind" path.
    if (key === 'Bearer sk-env-runtime-dead') return jsonResponse({ error: { type: 'authorized_error', message: 'invalid api key (2049)' } }, 401);
    return jsonResponse({ choices: [{ message: { content: '{"text":"OK"}' } }] });
  }, calls);
  const deps = {
    env: { MINIMAX_API_KEY: 'sk-env-runtime-dead' },
    keyFile: missingKeyFile(),
    credentials: fakeCredentials({ MINIMAX_CN_API_KEY: 'sk-cp-good' }),
    state,
    now: clock.now,
    fetch,
  };

  assert.equal(await chat({ system: 's', user: 'u' }, deps), '{"text":"OK"}');
  // probe(env) → chat(env) 401 → probe(credentials) → chat(credentials) 200
  assert.deepEqual(
    calls.map((call) => `${new URL(call.url).pathname.split('/').pop()}:${call.init.headers.Authorization}`),
    [
      'get_voice:Bearer sk-env-runtime-dead',
      'completions:Bearer sk-env-runtime-dead',
      'get_voice:Bearer sk-cp-good',
      'completions:Bearer sk-cp-good',
    ],
  );
  assert.equal(channelState(deps).coolingDown, false);
  assert.equal(channelState(deps).source, 'credentials');
});

test('全部来源都被 401 拒绝时给出可执行中文错误，并记住结果为负缓存', async () => {
  const calls = [];
  const clock = fakeClock();
  const state = createChannelState();
  const deps = {
    env: { MINIMAX_API_KEY: 'sk-dead-env' },
    keyFile: missingKeyFile(),
    credentials: fakeCredentials({ MINIMAX_CN_API_KEY: 'sk-dead-cn' }),
    state,
    now: clock.now,
    fetch: routedFetch(() => jsonResponse({ error: { type: 'authorized_error', message: 'invalid api key (2049)' } }, 401), calls),
  };
  await assert.rejects(
    () => chat({ system: 's', user: 'u' }, deps),
    (error) => {
      assert.equal(error.code, 'MINIMAX_INVALID_KEY');
      assert.match(error.message, /MiniMax API Key 无效或已失效/);
      return true;
    },
  );
  // Every candidate was probed once: the env key and the credential key.
  assert.equal(calls.length, 2);
  assert.match(channelState(deps).reason, /Key 不可用/);

  // A failed resolution is cached: the next request does not walk the ladder again.
  await assert.rejects(() => chat({ system: 's', user: 'u' }, deps), /MiniMax API Key 无效/);
  assert.equal(calls.length, 2);

  clock.advance(61_000);
  await assert.rejects(() => chat({ system: 's', user: 'u' }, deps), /MiniMax API Key 无效/);
  assert.equal(calls.length, 4);
});


test('404 模型下线映射成中文错误并进入冷却，冷却期内不再发请求', async () => {
  const calls = [];
  const clock = fakeClock();
  const state = createChannelState();
  const deps = {
    env: { MINIMAX_API_KEY: 'sk-good' },
    keyFile: missingKeyFile(),
    state,
    now: clock.now,
    fetch: routedFetch((url) => {
      if (url.endsWith('/get_voice')) return jsonResponse(VOICES_BODY);
      return jsonResponse({ error: { type: 'not_found_error', message: 'The model "MiniMax-Text-01" is no longer available. (2069)' } }, 404);
    }, calls),
  };

  await assert.rejects(
    () => chat({ system: 's', user: 'u' }, deps),
    (error) => {
      assert.equal(error.code, 'MINIMAX_MODEL_UNAVAILABLE');
      assert.match(error.message, /模型不可用|模型名可能已下线/);
      return true;
    },
  );
  assert.equal(coolingDown(deps), true);
  assert.equal(channelState(deps).lastFailure.providerCode, 2069);
  const requestsAfterFailure = calls.length;

  await assert.rejects(
    () => chat({ system: 's', user: 'u' }, deps),
    (error) => {
      assert.equal(error.code, 'MINIMAX_COOLDOWN');
      assert.match(error.message, /秒后自动恢复/);
      return true;
    },
  );
  assert.equal(calls.length, requestsAfterFailure, '冷却期内不该再发请求');

  // After the cooldown, MiniMax is tried again.
  clock.advance(5 * 60 * 1000 + 1);
  await assert.rejects(() => chat({ system: 's', user: 'u' }, deps), /模型不可用/);
  assert.ok(calls.length > requestsAfterFailure);
});

test('供应商错误码分别映射成可执行的中文提示', async () => {
  const cases = [
    {
      name: '401',
      status: 401,
      body: { error: { type: 'authorized_error', message: 'invalid api key (2049)' } },
      code: 'MINIMAX_INVALID_KEY',
      pattern: /API Key 无效/,
    },
    {
      name: '429',
      status: 429,
      body: { error: { type: 'rate_limit_error', message: 'rate limit' } },
      code: 'MINIMAX_RATE_LIMIT',
      pattern: /频率超限/,
    },
    {
      name: '500',
      status: 500,
      body: { error: { message: 'boom' } },
      code: 'MINIMAX_UNAVAILABLE',
      pattern: /服务暂时不可用/,
    },
    {
      name: '402 quota',
      status: 402,
      body: { error: { type: 'insufficient_balance_error', message: 'Token Plan limit (2067)' } },
      code: 'MINIMAX_QUOTA',
      pattern: /额度已用尽/,
    },
    {
      name: 'body 2049',
      status: 200,
      body: { base_resp: { status_code: 2049, status_msg: 'invalid api key' } },
      code: 'MINIMAX_INVALID_KEY',
      pattern: /API Key 无效/,
    },
    {
      name: 'body 2067',
      status: 200,
      body: { base_resp: { status_code: 2067, status_msg: 'Token Plan limit' } },
      code: 'MINIMAX_QUOTA',
      pattern: /额度已用尽/,
    },
  ];
  for (const item of cases) {
    const deps = {
      env: { MINIMAX_API_KEY: 'sk-x' },
      keyFile: missingKeyFile(),
      state: createChannelState(),
      fetch: routedFetch((url) => {
        if (url.endsWith('/get_voice')) return jsonResponse(VOICES_BODY);
        return jsonResponse(item.body, item.status);
      }),
    };
    await assert.rejects(
      () => chat({ system: 's', user: 'u' }, deps),
      (error) => {
        assert.equal(error.code, item.code, item.name);
        assert.match(error.message, item.pattern, item.name);
        return true;
      },
    );
  }
});

test('网络失败与超时都映射成中文错误', async () => {
  const networkDeps = {
    env: { MINIMAX_API_KEY: 'sk-x' },
    keyFile: missingKeyFile(),
    state: createChannelState(),
    fetch: routedFetch((url) => {
      if (url.endsWith('/get_voice')) return jsonResponse(VOICES_BODY);
      throw new Error('fetch failed');
    }),
  };
  await assert.rejects(
    () => chat({ system: 's', user: 'u' }, networkDeps),
    (error) => {
      assert.equal(error.code, 'MINIMAX_NETWORK');
      assert.match(error.message, /无法连接/);
      return true;
    },
  );

  const timeoutDeps = {
    env: { MINIMAX_API_KEY: 'sk-x' },
    keyFile: missingKeyFile(),
    state: createChannelState(),
    timeoutMs: 30,
    fetch: routedFetch((url, init) => {
      if (url.endsWith('/get_voice')) return jsonResponse(VOICES_BODY);
      return new Promise((resolve, reject) => {
        init.signal.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        }, { once: true });
      });
    }),
  };
  await assert.rejects(
    () => chat({ system: 's', user: 'u' }, timeoutDeps),
    (error) => {
      assert.equal(error.code, 'MINIMAX_TIMEOUT');
      assert.match(error.message, /超时/);
      return true;
    },
  );
});

test('chat 用 system 与 user 两条消息换来一段回答', async () => {
  const calls = [];
  const doFetch = fakeFetch({ choices: [{ message: { content: 'Pong!' } }] });
  const answer = await chat(
    { system: '你是助手', user: '说 pong', maxTokens: 20 },
    { key: 'k', state: createChannelState(), fetch: routedFetch(doFetch, calls) },
  );
  assert.equal(answer, 'Pong!');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /chat\/completions$/);
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.model, CHAT_MODEL);
  assert.equal(body.messages[0].role, 'system');
  assert.equal(body.messages[1].content, '说 pong');
  assert.equal(body.max_completion_tokens, 20);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer k');
});

test('chat 没有可用 key 时报错，且不发请求', async () => {
  const calls = [];
  const deps = {
    key: '',
    keyFile: missingKeyFile(),
    state: createChannelState(),
    fetch: routedFetch(() => jsonResponse({}), calls),
  };
  await assert.rejects(() => chat({ system: 's', user: 'u' }, deps), (error) => error.code === 'NO_KEY');
  assert.equal(calls.length, 0);
});

test('chat 把鉴权失败翻译成中文并保留原始 code', async () => {
  const doFetch = fakeFetch({ error: { message: 'invalid api key' } }, { status: 401 });
  await assert.rejects(
    () => chat({ system: 's', user: 'u' }, { key: 'k', state: createChannelState(), fetch: doFetch }),
    (error) => {
      assert.match(error.message, /鉴权失败|API Key 无效/);
      assert.equal(error.code, 'MINIMAX_INVALID_KEY');
      assert.equal(error.status, 401);
      return true;
    },
  );
});

test('tts 把十六进制音频变成可播放的 data URL', async () => {
  const calls = [];
  const hex = Buffer.from('ID3-audio-bytes').toString('hex');
  const doFetch = fakeFetch(
    { data: { audio: hex, status: 2 }, extra_info: { audio_length: 3996, audio_format: 'mp3' } },
  );
  const audio = await tts(
    { text: 'Hello', voiceId: 'English_Graceful_Lady', speed: 1.25 },
    { key: 'k', state: createChannelState(), fetch: routedFetch(doFetch, calls) },
  );
  assert.match(audio.url, /^data:audio\/mp3;base64,/);
  assert.equal(audio.durationMs, 3996);
  assert.equal(audio.format, 'mp3');
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.model, TTS_MODEL);
  assert.equal(body.voice_setting.voice_id, 'English_Graceful_Lady');
  assert.equal(body.voice_setting.speed, 1.25);
  assert.equal(body.audio_setting.format, 'mp3');
});

test('tts 用宿主 credentials 的 Key 也能工作（先探活再合成）', async () => {
  const calls = [];
  const hex = Buffer.from('audio').toString('hex');
  const deps = {
    env: emptyEnv(),
    keyFile: missingKeyFile(),
    credentials: fakeCredentials({ MINIMAX_CN_API_KEY: 'sk-cp-good' }),
    state: createChannelState(),
    fetch: routedFetch((url) => {
      if (url.endsWith('/get_voice')) return jsonResponse(VOICES_BODY);
      return jsonResponse({ data: { audio: hex }, extra_info: { audio_length: 1200, audio_format: 'mp3' } });
    }, calls),
  };
  const audio = await tts({ text: 'Hello' }, deps);
  assert.match(audio.url, /^data:audio\/mp3;base64,/);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].init.headers.Authorization, 'Bearer sk-cp-good');
});

test('tts 语速被夹在 0.5 到 2 之间', async () => {
  const calls = [];
  const doFetch = fakeFetch({ data: { audio: '00' } });
  await tts({ text: 'Hello', speed: 9 }, { key: 'k', state: createChannelState(), fetch: routedFetch(doFetch, calls) });
  assert.equal(JSON.parse(calls[0].init.body).voice_setting.speed, 2);
});

test('tts 没有内容时不发请求', async () => {
  await assert.rejects(
    () => tts({ text: '  ' }, { key: 'k', state: createChannelState(), fetch: fakeFetch({}) }),
    (error) => error.code === 'EMPTY_TEXT',
  );
});

test('voices 给出中英文音色并带上语言', async () => {
  const doFetch = fakeFetch({
    system_voice: [
      { voice_id: 'English_Graceful_Lady', voice_name: 'Graceful Lady' },
      { voice_id: 'female-shaonv', voice_name: '少女音色' },
      { voice_id: 'male-qn-jingying', voice_name: '精英青年音色' },
    ],
  });
  const list = await voices({ key: 'k', state: createChannelState(), fetch: doFetch });
  assert.deepEqual(list, [
    { id: 'English_Graceful_Lady', name: 'Graceful Lady', lang: 'en-US' },
    { id: 'female-shaonv', name: '少女音色', lang: 'zh-CN' },
    { id: 'male-qn-jingying', name: '精英青年音色', lang: 'zh-CN' },
  ]);
});

test('asr 把录音交给模型并拿回转写文本', async () => {
  const calls = [];
  const doFetch = routedFetch(() => jsonResponse({ text: 'Hello world, this is a reading test.', duration: 3.38 }), calls);
  const result = await asr(
    { audio: Buffer.from('fake-audio').toString('base64'), mimeType: 'audio/webm' },
    {
      key: 'k', state: createChannelState(), fetch: doFetch,
      convertAudio: async (bytes) => ({ bytes, filename: 'recording.wav' }),
    },
  );
  assert.equal(result.text, 'Hello world, this is a reading test.');
  assert.equal(result.duration, 3.38);
  assert.match(calls[0].url, /speech_to_text$/);
  // The body is a multipart form with the model the API accepts.
  assert.ok(calls[0].init.body instanceof FormData);
  assert.equal(calls[0].init.body.get('file').type, 'audio/wav');
  assert.equal(calls[0].init.body.get('model'), 'asr-1.0');
  assert.equal(calls[0].init.headers['Content-Type'], undefined);
});

test('asr 没有音频时不发请求', async () => {
  await assert.rejects(
    () => asr({ audio: '' }, { key: 'k', state: createChannelState(), fetch: async () => { throw new Error('不该调用'); } }),
    (error) => error.code === 'EMPTY_AUDIO',
  );
});

test('coverPrompt 只把书名交给模型，不让它写作者名', () => {
  const prompt = coverPrompt('MOVE: the 4-question Go-To-Market Framework');
  assert.match(prompt, /MOVE: the 4-question Go-To-Market Framework/);
  assert.match(prompt, /No author name/);
});

test('coverImage 生成封面并交回 data URL', async () => {
  const calls = [];
  const doFetch = routedFetch((url) => {
    if (url.includes('image_generation')) {
      return jsonResponse({ data: { image_urls: ['https://example.test/cover.jpg'] } });
    }
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'image/jpeg' },
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    };
  }, calls);
  const cover = await coverImage({ title: 'A Book' }, { key: 'k', state: createChannelState(), fetch: doFetch });
  assert.match(cover.url, /^data:image\/jpeg;base64,/);
  assert.equal(calls.length, 2);
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.model, 'image-01');
  assert.equal(body.aspect_ratio, '2:3');
});

test('isAuthError 认得出鉴权类失败', () => {
  assert.equal(isAuthError({ status: 401 }), true);
  assert.equal(isAuthError({ status: 403 }), true);
  assert.equal(isAuthError({ code: 'MINIMAX_INVALID_KEY' }), true);
  assert.equal(isAuthError({ status: 500 }), false);
  assert.equal(isAuthError(new Error('boom')), false);
});

test('resolveKey 直接返回缓存的 Key，不再探活', async () => {
  const clock = fakeClock();
  const state = createChannelState();
  const deps = {
    env: emptyEnv(),
    keyFile: missingKeyFile(),
    credentials: fakeCredentials({ MINIMAX_CN_API_KEY: 'sk-cp-good' }),
    state,
    now: clock.now,
    fetch: routedFetch(() => jsonResponse(VOICES_BODY)),
  };
  const first = await resolveKey(deps);
  assert.deepEqual({ source: first.source, id: first.id }, { source: 'credentials', id: 'credentials:MINIMAX_CN_API_KEY' });
  const second = await resolveKey(deps);
  assert.equal(second.key, first.key);
});

test('resetChannel 清掉缓存与冷却', async () => {
  const clock = fakeClock();
  const state = createChannelState();
  const deps = {
    env: { MINIMAX_API_KEY: 'sk-x' },
    keyFile: missingKeyFile(),
    state,
    now: clock.now,
    fetch: routedFetch((url) => {
      if (url.endsWith('/get_voice')) return jsonResponse(VOICES_BODY);
      return jsonResponse({ error: { message: 'boom' } }, 500);
    }),
  };
  await assert.rejects(() => chat({ system: 's', user: 'u' }, deps));
  assert.equal(coolingDown(deps), true);
  resetChannel(deps);
  assert.equal(coolingDown(deps), false);
  assert.equal(channelState(deps).lastFailure, null);
});

test('冷却期内 tts / voices 不发请求，直接给可执行中文错误（它们没有宿主回退路径）', async () => {
  const calls = [];
  const state = createChannelState();
  state.cooldownUntil = Date.now() + 4 * 60 * 1000;
  state.lastFailure = { code: 'MINIMAX_QUOTA', status: 402, providerCode: 2067, message: 'MiniMax 账户额度已用尽', at: Date.now() };
  const deps = {
    env: { MINIMAX_API_KEY: 'sk-x' },
    keyFile: missingKeyFile(),
    state,
    fetch: routedFetch(() => jsonResponse(VOICES_BODY), calls),
  };
  await assert.rejects(
    () => tts({ text: 'Hello' }, deps),
    (error) => {
      assert.equal(error.code, 'MINIMAX_COOLDOWN');
      assert.match(error.message, /秒后自动恢复/);
      assert.match(error.message, /额度已用尽/);
      return true;
    },
  );
  await assert.rejects(
    () => voices(deps),
    (error) => {
      assert.equal(error.code, 'MINIMAX_COOLDOWN');
      return true;
    },
  );
  assert.equal(calls.length, 0, '冷却期内不该给 MiniMax 发任何请求');
});

test('冷却只作用于 MiniMax 通道：resetChannel 后 TTS 立刻可用', async () => {
  const calls = [];
  const state = createChannelState();
  state.cooldownUntil = Date.now() + 60_000;
  state.lastFailure = { code: 'MINIMAX_QUOTA', status: 402, providerCode: 2067, message: '额度已用尽', at: Date.now() };
  const hex = Buffer.from('audio').toString('hex');
  const deps = {
    env: { MINIMAX_API_KEY: 'sk-x' },
    keyFile: missingKeyFile(),
    state,
    fetch: routedFetch((url) => {
      if (url.endsWith('/get_voice')) return jsonResponse(VOICES_BODY);
      return jsonResponse({ data: { audio: hex }, extra_info: { audio_length: 900, audio_format: 'mp3' } });
    }, calls),
  };
  await assert.rejects(() => tts({ text: 'Hello' }, deps), /额度/);
  resetChannel(deps);
  const audio = await tts({ text: 'Hello' }, deps);
  assert.match(audio.url, /^data:audio\/mp3;base64,/);
});

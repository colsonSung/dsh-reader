/**
 * Host half of the AI assist channel.
 *
 * The client half asks the Host for a model-backed answer — a word sheet, a
 * translation, a sentence breakdown. This module owns that conversation: it
 * picks the Host's default model, asks it for exactly one JSON object, and
 * hands the client back the shape the contract freezes.
 *
 * The Host's `llm` service is the only path into a model. This module never
 * talks to a provider itself, and it never renders anything.
 *
 * Every dependency is injectable so the behaviour can be tested without a
 * model: `llm`, `agentDefaultModel` and `timeoutMs`.
 */

import { randomUUID } from 'node:crypto';

import { translationLanguageName } from '../lib/languages.js';

/** The methods the client half may ask for. */
export const AI_METHODS = Object.freeze(['word', 'translate', 'breakdown', 'mindmap', 'podcast', 'podcastReply']);

/**
 * The session id this channel reports to a provider that routes by session.
 *
 * The route is reached from a browser fetch, not from an Agent turn, so no
 * session id is attached to the call. Some providers — opencode-go is one —
 * refuse a request that carries none (`MissingSessionID`) even when the API
 * key is valid. One stable id per process keeps those requests in one routing
 * bucket instead of minting a new bucket on every word card.
 */
const ASSIST_SESSION_ID = `reader-assist-${randomUUID()}`;

/** Wall-clock budget for one request, covering the JSON retry as well. */
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * How much of a chapter goes into one model request.
 *
 * The model is asked for an outline, not for a retelling of every sentence, so
 * a long chapter is cut rather than dropped: its head carries the argument the
 * outline is built on.
 */
const MAX_SOURCE_CHARS = 12000;

/** Raised when the Host has no model to answer with. */
const NO_MODEL_MESSAGE = '宿主未配置可用模型，AI 释义不可用';

/** Raised when the model answered but the answer was not usable JSON. */
const JSON_ERROR_MESSAGE = 'AI 返回的内容不是有效的 JSON，请重试';

/**
 * The system prompt of every method. The model is told to answer with one
 * JSON object and nothing else; the client renders fixed fields, so any prose
 * around the object would break the contract.
 */
const SYSTEM_PROMPTS = {
  word: [
    '你是一名英语学习助手，负责给学习者解释一个英文单词。',
    '只输出一个 JSON 对象：不要使用 Markdown 代码块，不要输出解释、前言或结尾语。',
    'JSON 字段说明：',
    '  word: 原词本身',
    '  phonetic: 国际音标，形如 /ˈmɪdɪəl/；不确定时给空字符串',
    '  partOfSpeech: 词性，如 noun、adjective、verb',
    '  definition: 一句话中文释义',
    '  examples: 例句数组，1 到 3 条，每条形如 { "en": "英文例句", "zh": "中文翻译" }',
    '  contextNote: 这个词在给定句子中怎么理解；没有给定句子时写常见用法说明',
    '所有字段都必须出现。',
  ].join('\n'),
  translate: [
    '你是一名英语学习助手，负责把英文内容翻译成中文。',
    '只输出一个 JSON 对象：不要使用 Markdown 代码块，不要输出解释、前言或结尾语。',
    'JSON 字段说明：',
    '  text: 整段内容的中文翻译，保持原文的段落与顺序',
    '所有字段都必须出现。',
  ].join('\n'),
  breakdown: [
    '你是一名英语学习助手，负责拆解英文长难句。',
    '只输出一个 JSON 对象：不要使用 Markdown 代码块，不要输出解释、前言或结尾语。',
    'JSON 字段说明：',
    '  structure: 成分数组，每条形如 { "token": "句子成分或短语", "note": "中文说明" }，按句子顺序排列',
    '  translation: 整句的中文翻译',
    '  simplified: 用简单句重述同一句话的说法',
    '所有字段都必须出现。',
  ].join('\n'),
  mindmap: [
    '你是一名英语学习助手，负责把一章英文内容整理成一张思维导图。',
    '只输出一个 JSON 对象：不要使用 Markdown 代码块，不要输出解释、前言或结尾语。',
    'JSON 字段说明：',
    '  title: 中心主题，10 个字以内',
    '  branches: 一级分支数组，3 到 6 条，每条形如 { "label": "分支标题", "quote": "原文里代表这个分支的一句英文", "items": [ { "label": "要点", "note": "一句话补充，可为空字符串", "quote": "原文里对应这个要点的一句英文" } ] }',
    '  每个分支的 items 为 2 到 4 条；要点要用章节里真实出现的内容，不要编造。',
    '  label 与 note 都用中文，note 不超过 30 个字。',
    '  quote 必须是从原文里**逐字抄下来**的一句英文（不超过 12 个词），学习者靠它在书里跳回这一段；找不到对应原句时给空字符串。',
    '所有字段都必须出现。',
  ].join('\n'),
  podcast: [
    '你是一名英语播客编剧，负责把一章英文内容改写成一段双人对话播客。',
    '只输出一个 JSON 对象：不要使用 Markdown 代码块，不要输出解释、前言或结尾语。',
    'JSON 字段说明：',
    '  title: 本期播客的标题（英文，不超过 12 个词）',
    '  summary: 一句话导语（英文，不超过 30 个词）',
    '  dialogue: 对话数组，8 到 16 条，每条形如 { "speaker": "host" 或 "guest", "text": "这句台词" }',
    '  host 是主持人，负责提问和串场；guest 是嘉宾，负责讲解。',
    '  所有台词都必须用英文，内容只围绕给定的范围，不要编造没有的情节。',
    '  每句台词 20 到 60 个词，口语化，适合朗读。',
    '所有字段都必须出现。',
  ].join('\n'),
  podcastReply: [
    '你是一档英语播客的主持人。学员正在听节目时插话，你要自然地接住它，再把这期节目继续讲下去。',
    '只输出一个 JSON 对象：不要使用 Markdown 代码块，不要输出解释、前言或结尾语。',
    'JSON 字段说明：',
    '  lines: 台词数组，2 到 4 条，每条形如 { "speaker": "host" 或 "guest", "text": "这句台词" }',
    '  先回应学员刚说的话，再顺着节目原来的话题继续。',
    '  所有台词用英文，语气自然口语化，每句 20 到 60 个词，适合朗读。',
    '所有字段都必须出现。',
  ].join('\n'),
};

/**
 * Read a string field and trim it.
 * @param {any} value - any value.
 * @returns {string} the trimmed string, or '' when the value is not a string.
 */
function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Build an error with a Chinese, user-facing message.
 * @param {string} message - the Chinese message.
 * @param {any} [cause] - the underlying failure, kept for diagnosis only.
 * @returns {Error} the error.
 */
function aiError(message, cause) {
  const error = new Error(message);
  if (cause !== undefined) error.cause = cause;
  return error;
}

/**
 * Translate a model-service failure into a Chinese sentence. The original
 * error never reaches the user; it stays on `cause`.
 * @param {any} error - the thrown failure.
 * @returns {string} the Chinese message.
 */
function modelErrorMessage(error) {
  const code = typeof error?.code === 'string' ? error.code : '';
  if (code === 'NO_ADAPTER') return NO_MODEL_MESSAGE;
  if (code === 'MISSING_CREDENTIAL') return '宿主模型缺少可用凭据，AI 释义不可用';
  if (code === 'INVALID_CREDENTIAL') return '宿主模型凭据无效，请检查模型配置';
  if (code === 'AUTH') return '宿主模型鉴权失败，请检查模型配置';
  if (code === 'QUOTA' || code === 'ACCOUNT_QUOTA') return '宿主模型额度不足，请检查账户余额';
  if (code === 'RATE_LIMIT') return '模型服务繁忙，请稍后重试';
  if (code === 'CONTEXT_WINDOW_EXCEEDED') return '内容过长，模型无法一次处理';
  if (code === 'ABORTED') return 'AI 请求已取消';
  return 'AI 调用失败，请稍后重试';
}

/**
 * Strip a markdown code fence, if the model wrapped its answer in one.
 * @param {string} raw - the raw model answer.
 * @returns {string} the answer without a fence.
 */
function stripFence(raw) {
  let value = raw.trim();
  if (value.startsWith('```')) {
    value = value.replace(/^```[a-zA-Z]*[ \t]*\r?\n?/, '').replace(/```[ \t]*$/, '').trim();
  }
  return value;
}

/**
 * Parse the model's answer into one JSON object.
 *
 * The answer is fenced often enough that the fence is stripped first. A model
 * that added a sentence around the object still parses: the outermost braces
 * are tried as a second candidate.
 * @param {string} raw - the raw model answer.
 * @returns {object} the parsed object.
 * @throws {Error} when the answer holds no JSON object.
 */
export function parseModelJson(raw) {
  const value = stripFence(typeof raw === 'string' ? raw : '');
  const candidates = [value];
  const start = value.indexOf('{');
  const end = value.lastIndexOf('}');
  if (start >= 0 && end > start) candidates.push(value.slice(start, end + 1));
  for (const candidate of candidates) {
    let parsed;
    try {
      parsed = JSON.parse(candidate);
    } catch {
      continue;
    }
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  }
  throw new Error('model answer is not a JSON object');
}

/**
 * The three methods, their prompt, their input check and their result shape.
 *
 * `normalize` is the only place that decides what the client receives, so the
 * contract's fields are guaranteed even when the model omits one.
 */
const SPECS = {
  word: {
    maxTokens: 800,
    timeoutMs: 60000,
    /**
     * @param {any} payload - the client payload.
     * @returns {{word: string, sentence: string}} the checked input.
     */
    validate(payload) {
      const word = text(payload?.word);
      if (word === '') throw aiError('缺少要查询的单词');
      return { word, sentence: text(payload?.sentence) };
    },
    /**
     * @param {{word: string, sentence: string}} request - the checked input.
     * @returns {string} the user prompt.
     */
    user(request) {
      return request.sentence === ''
        ? `单词：${request.word}`
        : `单词：${request.word}\n例句：${request.sentence}`;
    },
    /**
     * @param {any} raw - the model's JSON object.
     * @param {{word: string}} request - the checked input.
     * @returns {object} the client result.
     */
    normalize(raw, request) {
      const examples = (Array.isArray(raw?.examples) ? raw.examples : [])
        .filter((example) => example !== null && typeof example === 'object')
        .map((example) => ({ en: text(example.en), zh: text(example.zh) }))
        .slice(0, 3);
      return {
        word: text(raw?.word) || request.word,
        phonetic: text(raw?.phonetic),
        partOfSpeech: text(raw?.partOfSpeech),
        definition: text(raw?.definition),
        examples,
        contextNote: text(raw?.contextNote),
      };
    },
  },
  translate: {
    maxTokens: 1200,
    timeoutMs: 90000,
    /**
     * @param {any} payload - the client payload.
     * @returns {{text: string, target: string}} the checked input.
     */
    validate(payload) {
      const source = text(payload?.text);
      if (source === '') throw aiError('缺少要翻译的内容');
      // The target language is a name from the fixed list: nothing the page
      // sends can put words of its own into the prompt.
      return { text: source, target: translationLanguageName(payload?.target) };
    },
    /**
     * @param {{text: string, target: string}} request - the checked input.
     * @returns {string} the system prompt.
     */
    system(request) {
      return [
        '你是一名语言学习助手，负责把原文翻译成指定的语言。',
        '只输出一个 JSON 对象：不要使用 Markdown 代码块，不要输出解释、前言或结尾语。',
        'JSON 字段说明：',
        `  text: 整段内容翻译成${request.target}之后的译文，保持原文的段落与顺序`,
        '所有字段都必须出现。',
      ].join('\n');
    },
    /**
     * @param {{text: string, target: string}} request - the checked input.
     * @returns {string} the user prompt.
     */
    user(request) {
      return `请把下面这段内容翻译成${request.target}：\n${request.text}`;
    },
    /**
     * @param {any} raw - the model's JSON object.
     * @returns {object} the client result.
     */
    normalize(raw) {
      return { text: text(raw?.text) };
    },
  },
  breakdown: {
    maxTokens: 1200,
    timeoutMs: 90000,
    /**
     * @param {any} payload - the client payload.
     * @returns {{sentence: string}} the checked input.
     */
    validate(payload) {
      const sentence = text(payload?.sentence);
      if (sentence === '') throw aiError('缺少要拆解的句子');
      return { sentence };
    },
    /**
     * @param {{sentence: string}} request - the checked input.
     * @returns {string} the user prompt.
     */
    user(request) {
      return `请拆解下面这个句子：\n${request.sentence}`;
    },
    /**
     * @param {any} raw - the model's JSON object.
     * @returns {object} the client result.
     */
    normalize(raw) {
      const structure = (Array.isArray(raw?.structure) ? raw.structure : [])
        .filter((entry) => entry !== null && typeof entry === 'object')
        .map((entry) => ({ token: text(entry.token), note: text(entry.note) }));
      return {
        structure,
        translation: text(raw?.translation),
        simplified: text(raw?.simplified),
      };
    },
  },
  mindmap: {
    maxTokens: 3000,
    timeoutMs: 90000,
    /**
     * @param {any} payload - the client payload.
     * @returns {{title: string, chapterTitle: string, text: string}} the checked input.
     */
    validate(payload) {
      const source = text(payload?.text);
      if (source === '') throw aiError('缺少要整理的章节内容');
      return {
        title: text(payload?.title),
        chapterTitle: text(payload?.chapterTitle),
        text: source.slice(0, MAX_SOURCE_CHARS),
      };
    },
    /**
     * @param {{title: string, chapterTitle: string, text: string}} request - the checked input.
     * @returns {string} the user prompt.
     */
    user(request) {
      const header = [
        request.title === '' ? '' : `书名：${request.title}`,
        request.chapterTitle === '' ? '' : `章节：${request.chapterTitle}`,
      ].filter((line) => line !== '').join('\n');
      return `${header}\n\n请把下面这一章整理成一张思维导图：\n${request.text}`;
    },
    /**
     * @param {any} raw - the model's JSON object.
     * @returns {object} the client result.
     */
    normalize(raw) {
      const branches = (Array.isArray(raw?.branches) ? raw.branches : [])
        .filter((branch) => branch !== null && typeof branch === 'object')
        .map((branch) => ({
          label: text(branch.label),
          // The quote is how the learner gets back to the passage: the client
          // looks it up in the chapter and turns it into a jump target.
          quote: text(branch.quote),
          items: (Array.isArray(branch.items) ? branch.items : [])
            .filter((item) => item !== null && typeof item === 'object')
            .map((item) => ({ label: text(item.label), note: text(item.note), quote: text(item.quote) }))
            .slice(0, 6),
        }))
        .filter((branch) => branch.label !== '')
        .slice(0, 8);
      return { title: text(raw?.title), branches };
    },
  },
  podcast: {
    maxTokens: 4000,
    timeoutMs: 180000,
    /**
     * @param {any} payload - the client payload.
     * @returns {{title: string, chapterTitle: string, scope: string, text: string}} the checked input.
     */
    validate(payload) {
      const source = text(payload?.text);
      if (source === '') throw aiError('缺少要改写的章节内容');
      return {
        title: text(payload?.title),
        chapterTitle: text(payload?.chapterTitle),
        scope: payload?.scope === 'book' ? 'book' : 'chapter',
        text: source.slice(0, MAX_SOURCE_CHARS),
      };
    },
    /**
     * @param {{title: string, chapterTitle: string, scope: string, text: string}} request - the checked input.
     * @returns {string} the user prompt.
     */
    user(request) {
      const wholeBook = request.scope === 'book';
      const header = [
        request.title === '' ? '' : `书名：${request.title}`,
        wholeBook
          ? '范围：全书'
          : (request.chapterTitle === '' ? '' : `章节：${request.chapterTitle}`),
      ].filter((line) => line !== '').join('\n');
      const ask = wholeBook
        ? '请把下面这本书改写成一段双人对话播客，覆盖全书的主要脉络：'
        : '请把下面这一章改写成一段双人对话播客：';
      return `${header}\n\n${ask}\n${request.text}`;
    },
    /**
     * @param {any} raw - the model's JSON object.
     * @returns {object} the client result.
     */
    normalize(raw) {
      const dialogue = (Array.isArray(raw?.dialogue) ? raw.dialogue : [])
        .filter((line) => line !== null && typeof line === 'object')
        .map((line) => {
          const speaker = text(line.speaker).toLowerCase();
          return {
            speaker: speaker.includes('host') || speaker.includes('主持') ? 'host' : 'guest',
            text: text(line.text).slice(0, 800),
          };
        })
        .filter((line) => line.text !== '')
        .slice(0, 24);
      return { title: text(raw?.title), summary: text(raw?.summary), dialogue };
    },
  },
  podcastReply: {
    maxTokens: 2000,
    timeoutMs: 120000,
    /**
     * @param {any} payload - the client payload.
     * @returns {{title: string, chapterTitle: string, text: string, said: string}} the checked input.
     */
    validate(payload) {
      const said = text(payload?.said);
      if (said === '') throw aiError('缺少学员说的话');
      return {
        title: text(payload?.title),
        chapterTitle: text(payload?.chapterTitle),
        text: text(payload?.text).slice(0, 4000),
        said: said.slice(0, 1000),
      };
    },
    /**
     * @param {{title: string, chapterTitle: string, text: string, said: string}} request - the checked input.
     * @returns {string} the user prompt.
     */
    user(request) {
      const header = [
        request.title === '' ? '' : `书名：${request.title}`,
        request.chapterTitle === '' ? '' : `章节：${request.chapterTitle}`,
      ].filter((line) => line !== '').join('\n');
      const soFar = request.text === '' ? '（节目刚开始）' : request.text;
      return [
        header,
        '',
        `节目到目前为止的对话：\n${soFar}`,
        '',
        `学员插话：${request.said}`,
        '',
        '请接住学员的插话，把这期节目继续讲下去。',
      ].join('\n');
    },
    /**
     * @param {any} raw - the model's JSON object.
     * @returns {object} the client result.
     */
    normalize(raw) {
      const lines = (Array.isArray(raw?.lines) ? raw.lines : [])
        .filter((line) => line !== null && typeof line === 'object')
        .map((line) => {
          const speaker = text(line.speaker).toLowerCase();
          return {
            speaker: speaker.includes('guest') || speaker.includes('嘉宾') ? 'guest' : 'host',
            text: text(line.text).slice(0, 800),
          };
        })
        .filter((line) => line.text !== '')
        .slice(0, 6);
      return { lines };
    },
  },
};

/**
 * Read one Host service without assuming it is mounted.
 * @param {any} ctx - the Host plugin context.
 * @param {string} name - the service name.
 * @returns {any} the service, or undefined.
 */
export function serviceOf(ctx, name) {
  try {
    if (ctx !== null && ctx !== undefined && typeof ctx.get === 'function') {
      const found = ctx.get(name);
      if (found !== undefined && found !== null) return found;
    }
  } catch {
    // The context does not expose services this way; try the property below.
  }
  try {
    if (ctx !== null && ctx !== undefined) {
      const found = ctx[name];
      if (found !== undefined && found !== null) return found;
    }
  } catch {
    // The service is not reachable from this context.
  }
  return undefined;
}

/**
 * Ask the model for one completion and return its text.
 *
 * The call is prepared first, because a prepared call binds one adapter
 * generation to one dispatch: `stream` refuses options whose provider, model,
 * reasoning effort, temperature or token cap differ from the prepared config.
 * The stream options are therefore built from `prepared.config`.
 *
 * The sampling temperature is deliberately left to the route's own default:
 * some reasoning routes reject any value other than theirs (the model k3, for
 * example, answers a non-1 temperature with HTTP 400), and the JSON contract is
 * enforced by the prompt and the one strict retry instead of by sampling.
 * @param {object} options - the call parameters.
 * @returns {Promise<string>} the model's answer.
 */
async function complete({ llm, provider, model, reasoningEffort, system, user, maxTokens, signal }) {
  // A reasoning model is bound to its reasoning effort: the prepared call and
  // the dispatched stream must name the same one, so the selection's effort is
  // carried through instead of being dropped on the floor.
  const prepareConfig = { provider, model, maxTokens };
  if (typeof reasoningEffort === 'string' && reasoningEffort !== '') prepareConfig.reasoningEffort = reasoningEffort;
  const prepared = await llm.prepareCall(prepareConfig, signal);
  const config = prepared?.config ?? prepareConfig;
  const request = {
    ...config,
    // A provider that routes by session (opencode-go) rejects the call
    // without one; the config comparison ignores this field, so it may ride
    // on the prepared request.
    sessionId: ASSIST_SESSION_ID,
    messages: [{ role: 'user', content: [{ type: 'text', text: user }] }],
    system,
    signal,
  };
  const stream = prepared.stream(request);
  let answer = '';
  let failure;
  for await (const chunk of stream) {
    if (chunk === null || typeof chunk !== 'object') continue;
    if (chunk.type === 'text-delta' && typeof chunk.text === 'string') {
      answer += chunk.text;
      continue;
    }
    if (chunk.type === 'finish') {
      const reason = chunk.reason;
      if (reason !== null && typeof reason === 'object' && (reason.kind === 'error' || reason.kind === 'aborted')) {
        failure = reason;
      }
    }
  }
  if (failure !== undefined) {
    const error = new Error(modelErrorMessage(failure.failure));
    error.code = typeof failure.failure?.code === 'string' ? failure.failure.code : '';
    // The provider's own words, for the failure details: the learner reads the
    // Chinese sentence above, a developer needs to know what the route said.
    if (typeof failure.failure?.message === 'string' && failure.failure.message !== '') {
      error.providerMessage = failure.failure.message.slice(0, 300);
    }
    throw error;
  }
  return answer;
}

/** How much of the whole request budget the MiniMax channel may take. */
const MINIMAX_BUDGET_MS = 20000;

/** Provider codes that mean "the MiniMax key itself is the problem". */
const KEY_FAILURE_CODES = new Set(['MINIMAX_INVALID_KEY', 'MINIMAX_AUTH', 'NO_KEY']);

/**
 * The services the MiniMax channel needs from the Host.
 *
 * The credential store is read per request: the Host may mount or replace it,
 * and a rotated key must reach the next operation.
 *
 * @param {object} deps - the injected dependencies.
 * @returns {object} the channel dependencies.
 */
function minimaxDeps(deps) {
  const channel = {};
  if (deps.credentials !== undefined) channel.credentials = deps.credentials;
  if (deps.minimaxState !== undefined) channel.state = deps.minimaxState;
  if (deps.minimaxFetch !== undefined) channel.fetch = deps.minimaxFetch;
  if (typeof deps.now === 'function') channel.now = deps.now;
  if (Number.isFinite(deps.minimaxTimeoutMs) && deps.minimaxTimeoutMs > 0) channel.timeoutMs = deps.minimaxTimeoutMs;
  return channel;
}

/**
 * The public view of the MiniMax channel, if the caller injected one.
 * @param {any} minimax - the MiniMax channel.
 * @param {object} channelDeps - its dependencies.
 * @returns {object|null} the state view, never the key.
 */
function channelSnapshot(minimax, channelDeps) {
  if (minimax === undefined || minimax === null || typeof minimax.channelState !== 'function') return null;
  try {
    return minimax.channelState(channelDeps) ?? null;
  } catch {
    return null;
  }
}

/**
 * Whether the MiniMax channel can answer right now. A channel that is cooling
 * down is skipped entirely: the Host's own model answers instead.
 *
 * @param {any} minimax - the MiniMax channel, if the caller injected one.
 * @param {object} channelDeps - the channel dependencies.
 * @returns {Promise<boolean>} true when the channel is usable.
 */
async function minimaxReady(minimax, channelDeps) {
  if (minimax === undefined || minimax === null || typeof minimax.chat !== 'function') return false;
  if (typeof minimax.isAvailable !== 'function') return true;
  try {
    return (await minimax.isAvailable(channelDeps)) === true;
  } catch {
    return false;
  }
}

/**
 * Whether the Host's own model can answer.
 * @param {object} deps - the injected dependencies.
 * @returns {boolean} true when `llm` and the default model are both mounted.
 */
function hostModelAvailable(deps) {
  const llm = deps.llm;
  const agentDefaultModel = deps.agentDefaultModel;
  if (llm === undefined || llm === null || typeof llm.prepareCall !== 'function') return false;
  if (agentDefaultModel === undefined || agentDefaultModel === null || typeof agentDefaultModel.currentSelection !== 'function') return false;
  return true;
}

/**
 * The provider and model the Host's own model currently answers with.
 * @param {object} deps - the injected dependencies.
 * @returns {{provider: string, model: string}} the selection.
 * @throws {Error} when the Host has no model selected.
 */
function hostSelection(deps) {
  const agentDefaultModel = deps.agentDefaultModel;
  if (agentDefaultModel === undefined || agentDefaultModel === null || typeof agentDefaultModel.currentSelection !== 'function') {
    throw aiError(NO_MODEL_MESSAGE);
  }
  const selection = agentDefaultModel.currentSelection();
  const provider = text(selection?.provider);
  const model = text(selection?.model);
  if (provider === '' || model === '') throw aiError(NO_MODEL_MESSAGE);
  const reasoningEffort = text(selection?.reasoningEffort);
  return { provider, model, reasoningEffort };
}

/**
 * The Chinese sentence of a failure, for the combined message.
 * @param {any} error - the thrown failure.
 * @returns {string} the sentence, or a fallback.
 */
function reasonOf(error) {
  const message = typeof error?.message === 'string' ? error.message.trim() : '';
  return message === '' ? '未知原因' : message;
}

/**
 * Whether a failure means the MiniMax key is dead.
 * @param {any} error - the thrown failure.
 * @returns {boolean} true when the key is the problem.
 */
function isKeyFailure(error) {
  const code = typeof error?.code === 'string' ? error.code : '';
  if (KEY_FAILURE_CODES.has(code)) return true;
  return error?.status === 401 || error?.status === 403;
}

/**
 * Build the failure both channels report: the learner gets an actionable
 * Chinese sentence naming both causes, the developer gets `details`.
 *
 * @param {any} minimaxError - why MiniMax could not answer.
 * @param {any} llmError - why the Host model could not answer either.
 * @returns {Error} the combined failure.
 */
function bothChannelsFailed(minimaxError, llmError) {
  const keyFailure = isKeyFailure(minimaxError);
  const minimaxText = keyFailure
    ? `MiniMax Key 失效（${reasonOf(minimaxError)}）`
    : `MiniMax 通道不可用（${reasonOf(minimaxError)}）`;
  const llmText = `宿主模型不可用（${reasonOf(llmError)}）`;
  const error = aiError(`${minimaxText}，${llmText}`, llmError);
  error.code = keyFailure ? 'AI_MINIMAX_KEY_INVALID' : 'AI_MINIMAX_UNAVAILABLE';
  error.details = {
    minimax: {
      code: typeof minimaxError?.code === 'string' ? minimaxError.code : '',
      status: typeof minimaxError?.status === 'number' ? minimaxError.status : 0,
      providerCode: typeof minimaxError?.providerCode === 'number' ? minimaxError.providerCode : 0,
    },
    llm: {
      code: typeof llmError?.code === 'string' ? llmError.code : '',
      message: reasonOf(llmError).slice(0, 200),
      provider: typeof llmError?.provider === 'string' ? llmError.provider : '',
      model: typeof llmError?.model === 'string' ? llmError.model : '',
      providerMessage: typeof llmError?.providerMessage === 'string' ? llmError.providerMessage : '',
    },
  };
  return error;
}

/**
 * Rebuild a failure from the channel's remembered last failure.
 * @param {{code?: string, status?: number, providerCode?: number, message?: string}} failure - the remembered failure.
 * @returns {Error} the failure.
 */
function failureFromSnapshot(failure) {
  const error = new Error(typeof failure?.message === 'string' && failure.message !== '' ? failure.message : 'MiniMax 通道不支持当前请求');
  if (typeof failure?.code === 'string' && failure.code !== '') error.code = failure.code;
  if (typeof failure?.status === 'number' && failure.status > 0) error.status = failure.status;
  if (typeof failure?.providerCode === 'number' && failure.providerCode !== 0) error.providerCode = failure.providerCode;
  return error;
}

/**
 * The failure of one request that ran out of its wall-clock budget.
 * @param {number} timeoutMs - the budget.
 * @param {any} cause - the underlying failure.
 * @returns {Error} the failure.
 */
function timeoutFailure(timeoutMs, cause) {
  return aiError(`AI 请求超时（${Math.max(1, Math.round(timeoutMs / 1000))} 秒），请稍后再试`, cause);
}

/**
 * Ask the MiniMax chat model for one completion.
 *
 * Provider failures keep their mapped Chinese message and their code: the
 * caller decides whether to cool the channel down and fall back.
 *
 * @param {object} options - the call parameters.
 * @param {object} options.minimax - the MiniMax channel.
 * @param {string} options.system - the system prompt.
 * @param {string} options.user - the user prompt.
 * @param {number} options.maxTokens - the token cap.
 * @param {object} options.channelDeps - the channel dependencies (credential store, state, signal, timeout).
 * @returns {Promise<string>} the model's answer.
 */
async function completeWithMinimax({ minimax, system, user, maxTokens, channelDeps }) {
  try {
    return await minimax.chat({ system, user, maxTokens }, channelDeps);
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    if (typeof error?.code === 'string' && error.code !== '') throw error;
    if (error instanceof Error && /[\u4e00-\u9fff]/.test(error.message)) throw error;
    throw aiError(`MiniMax 调用失败：${reasonOf(error)}`, error);
  }
}

/**
 * Run one AI assist request.
 *
 * The MiniMax channel answers first when it is configured and healthy. Any
 * runtime failure of that channel (bad key, quota, rate limit, 5xx, timeout,
 * a model that no longer exists) cools the channel down and the same request
 * immediately continues on the Host's own model. When the Host model fails too,
 * the learner gets one actionable Chinese sentence naming both causes.
 *
 * @param {'word'|'translate'|'breakdown'} method - the method to run.
 * @param {object} payload - the method payload.
 * @param {object} [deps] - the injected dependencies.
 * @param {object} [deps.llm] - the Host's `llm` service.
 * @param {object} [deps.agentDefaultModel] - the Host's `agentDefaultModel` service.
 * @param {object} [deps.credentials] - the Host's `credentials` service.
 * @param {object} [deps.minimax] - the MiniMax channel.
 * @param {number} [deps.timeoutMs] - the wall-clock budget of the request.
 * @returns {Promise<object>} the result, in the shape the contract freezes.
 * @throws {Error} with a Chinese message when the request cannot be served.
 */
export async function runAiMethod(method, payload, deps = {}) {
  const spec = Object.prototype.hasOwnProperty.call(SPECS, method) ? SPECS[method] : undefined;
  if (spec === undefined) throw aiError(`不支持的 AI 方法：${String(method)}`);

  const request = spec.validate(payload);

  // A big generation (a chapter outline, a podcast script) needs more wall
  // clock than a word sheet; the caller may still set the budget explicitly.
  const defaultTimeoutMs = Number.isFinite(spec.timeoutMs) && spec.timeoutMs > 0 ? spec.timeoutMs : DEFAULT_TIMEOUT_MS;
  const timeoutMs = Number.isFinite(deps.timeoutMs) && deps.timeoutMs > 0 ? deps.timeoutMs : defaultTimeoutMs;
  const startedAt = Date.now();
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    // A method may build its own system prompt: the translation names the
    // language the learner asked for.
    const system = typeof spec.system === 'function' ? spec.system(request) : SYSTEM_PROMPTS[method];
    const user = spec.user(request);
    const minimax = deps.minimax;
    const channelDeps = minimaxDeps(deps);
    const hostAvailable = hostModelAvailable(deps);
    const minimaxUsable = await minimaxReady(minimax, channelDeps);
    if (!hostAvailable && !minimaxUsable) throw aiError(NO_MODEL_MESSAGE);

    /**
     * Ask the Host's own model.
     * @param {string} finalSystem - the system prompt.
     * @returns {Promise<string>} the answer.
     */
    const hostCall = async (finalSystem) => {
      const selection = hostSelection(deps);
      try {
        return await complete({
          llm: deps.llm,
          provider: selection.provider,
          model: selection.model,
          reasoningEffort: selection.reasoningEffort,
          system: finalSystem,
          user,
          maxTokens: spec.maxTokens,
          signal: controller.signal,
        });
      } catch (error) {
        if (timedOut) throw timeoutFailure(timeoutMs, error);
        if (error?.name === 'AbortError') throw aiError('AI 请求已取消', error);
        const wrapped = aiError(modelErrorMessage(error), error);
        if (typeof error?.code === 'string' && error.code !== '') wrapped.code = error.code;
        // Who was asked, for the failure details: a model name is not a secret.
        wrapped.provider = selection.provider;
        wrapped.model = selection.model;
        if (typeof error?.providerMessage === 'string' && error.providerMessage !== '') {
          wrapped.providerMessage = error.providerMessage;
        }
        throw wrapped;
      }
    };

    /**
     * Ask MiniMax, within the budget left for it.
     * @param {string} finalSystem - the system prompt.
     * @returns {Promise<string>} the answer.
     */
    const minimaxCall = (finalSystem) => {
      const remaining = timeoutMs - (Date.now() - startedAt);
      const budget = Math.max(4000, Math.min(MINIMAX_BUDGET_MS, remaining));
      return completeWithMinimax({
        minimax,
        system: finalSystem,
        user,
        maxTokens: spec.maxTokens,
        channelDeps: { ...channelDeps, signal: controller.signal, timeoutMs: budget },
      });
    };

    /**
     * Continue the same request on the Host model after MiniMax failed.
     * @param {string} finalSystem - the system prompt.
     * @param {any} minimaxError - why MiniMax failed.
     * @returns {Promise<string>} the answer.
     */
    const fallbackToHost = async (finalSystem, minimaxError) => {
      if (!hostAvailable) throw bothChannelsFailed(minimaxError, aiError(NO_MODEL_MESSAGE));
      try {
        return await hostCall(finalSystem);
      } catch (llmError) {
        if (timedOut) throw timeoutFailure(timeoutMs, llmError);
        throw bothChannelsFailed(minimaxError, llmError);
      }
    };

    /**
     * Run one attempt on one channel, with the fallback rules.
     * @param {'minimax'|'host'} channel - the channel to try first.
     * @param {string} finalSystem - the system prompt.
     * @returns {Promise<{answer: string, channel: 'minimax'|'host'}>} the answer and the channel that gave it.
     */
    const attemptOn = async (channel, finalSystem) => {
      if (channel === 'minimax') {
        try {
          return { answer: await minimaxCall(finalSystem), channel: 'minimax' };
        } catch (error) {
          if (timedOut) throw timeoutFailure(timeoutMs, error);
          if (error?.name === 'AbortError') throw aiError('AI 请求已取消', error);
          // The same request continues on the Host model: the channel is now
          // cooling down, so every later request skips it for five minutes.
          const answer = await fallbackToHost(finalSystem, error);
          return { answer, channel: 'host' };
        }
      }
      try {
        return { answer: await hostCall(finalSystem), channel: 'host' };
      } catch (error) {
        if (timedOut) throw error;
        // MiniMax was skipped because it is cooling down: name both causes.
        const snapshot = channelSnapshot(minimax, channelDeps);
        if (snapshot !== null && snapshot.coolingDown === true && snapshot.lastFailure !== null) {
          throw bothChannelsFailed(failureFromSnapshot(snapshot.lastFailure), error);
        }
        throw error;
      }
    };

    const first = await attemptOn(minimaxUsable ? 'minimax' : 'host', system);

    try {
      return spec.normalize(parseModelJson(first.answer), request);
    } catch (firstError) {
      // The answer was not JSON: ask once more, with a stricter prompt, on the
      // channel that answered.
      const retry = await attemptOn(first.channel, `${system}\n只输出一个 JSON 对象。`);
      try {
        return spec.normalize(parseModelJson(retry.answer), request);
      } catch (secondError) {
        throw aiError(JSON_ERROR_MESSAGE, secondError ?? firstError);
      }
    }
  } finally {
    clearTimeout(timer);
  }
}

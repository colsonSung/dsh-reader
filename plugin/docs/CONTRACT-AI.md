# reader — 第二轮契约（TingYue 对标：词典+AI / 生词本 / 进度 / 计划）

版本: 2.0 · 状态: 已冻结

目标：把 TingYue（听阅）的核心学习闭环补齐——**点词查词（AI 释义）→ 收藏进生词本 → 词汇进度 → 复习队列**，外加 **符号替换** 与 **完形填空** 两个练习增强。

数据流：

```
点词 ──► WordCard（src/ui/wordcard.js）──► askAi('word')  ──► Host /api/reader ──► ctx.llm
   │                                                      └─► 本地词典兜底（无 AI 时）
   └──► 生词本（src/lib/vocab.js）──► IndexedDB ──► 进度 / 复习队列
```

---

## 1. Host 半边（负责人: ai）

### 1.1 路由

`index.js` 里按 remote-control 的写法注册（**不要自己发明模式**）：

```js
ctx.inject(['connection'], (connectionCtx) => {
  connectionCtx.effect(() => {
    try {
      return connectionCtx.connection.fetch.register({
        path: '/api/reader',
        methods: ['POST'],
        requestBody: 'buffered',
        fetch: async (request) => {
          let body
          try { body = await request.json() } catch {
            return Response.json({ ok: false, error: { code: 'reader/bad-request', message: 'body is not JSON', details: {} } }, { status: 400 })
          }
          const method = typeof body?.method === 'string' ? body.method : ''
          try {
            return Response.json({ ok: true, result: await handle(method, body?.payload ?? {}) })
          } catch (error) {
            return Response.json({ ok: false, error: { code: 'reader/failed', message: String(error?.message ?? error), details: {} } }, { status: 200 })
          }
        },
      })
    } catch (error) {
      // 重复 apply（热重载）时路由已存在，记日志后返回，不让插件整体失败
      console.warn('[reader] route registration failed: ' + String(error))
      return () => {}
    }
  }, 'reader: /api/reader')
})
```

### 1.2 模型调用

用宿主现成的 `llm` 服务（不要自己发 HTTP 到模型厂商）：

- `ctx.agentDefaultModel.currentSelection()` → `{ provider, model, ... }`
- `ctx.llm.prepareCall({ provider, model })` → `prepared`
- `prepared.stream({ provider, model, messages, system, temperature, maxTokens, signal })` → 异步可迭代
  流里的 `text-delta` 块的 `text` 拼起来就是完整回复；`finish` 块表示结束。

要点：
- **必须要求模型只输出 JSON**（system 提示里写死 schema），然后 `JSON.parse`；解析失败要重试一次（放宽提示）仍失败则抛错。
- 温度 0.2 左右，maxTokens 800–1200。
- `ctx.get('llm')` 可能不存在（没有模型配置）→ 返回一个可读的中文错误，例如「宿主未配置可用模型，AI 释义不可用」。
- 单次调用整体要有超时（30s），超时抛错。

### 1.3 `src/host/ai.js`

```js
/**
 * 执行一次 AI 辅助请求。
 * @param {string} method - 'word' | 'translate' | 'breakdown' | 'mindmap' | 'podcast'
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function runAiMethod(method, payload);
```

五个方法的返回结构（**客户端按这些字段渲染，不得再改**）：

```js
// method: 'word'   payload: { word: string, sentence?: string }
// → {
//   word: string,
//   phonetic: string,        // 例：/ˈmɪdɪəl/
//   partOfSpeech: string,    // 例：adjective
//   definition: string,      // 中文释义，一句话
//   examples: [{ en: string, zh: string }],   // 1–3 条
//   contextNote: string,     // 这个词在当前句子里怎么理解；没有句子时给用法说明
// }

// method: 'translate'   payload: { text: string }
// → { text: string }        // 整段中文翻译

// method: 'breakdown'   payload: { sentence: string }
// → {
//   structure: [{ token: string, note: string }],  // 长难句成分拆解
//   translation: string,                            // 中文翻译
//   simplified: string,                            // 改成简单句的说法
// }

// method: 'mindmap'   payload: { title: string, chapterTitle: string, text: string }
// → {
//   title: string,                                 // 中心主题
//   branches: [{
//     label: string,                               // 分支标题
//     quote: string,                               // 原文里代表这个分支的一句英文
//     items: [{ label: string, note: string, quote: string }],
//   }],
// }                        // 一层分支，每支 2–4 个要点；quote 是原文短句，客户端靠它在书里定位

// method: 'podcast'   payload: { title: string, chapterTitle: string, scope: 'chapter' | 'book', text: string }
// → {
//   title: string,                                 // 本期标题
//   summary: string,                               // 一句话导语
//   dialogue: [{ speaker: 'host' | 'guest', text: string }],
// }                                                // 英文双人对话，按顺序念

// method: 'podcastReply'   payload: { title: string, chapterTitle: string, text: string, said: string }
// → {
//   lines: [{ speaker: 'host' | 'guest', text: string }],
// }                        // 学员插话后主持人的回应，节目从这儿继续
```

---

## 2. 客户端 AI 通道（负责人: ai）

`src/lib/ai.js`：

```js
/**
 * 调用宿主的 AI 辅助接口。
 * @param {'word'|'translate'|'breakdown'|'mindmap'|'podcast'} method
 * @param {object} payload
 * @returns {Promise<object>} 与 1.3 的返回结构一致
 */
export async function askAi(method, payload);
```

- `fetch('/api/reader', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ method, payload }) })`
- 解析 `{ ok, result }`；`ok === false` 时抛出带中文文案的 Error。
- 网络失败同样抛中文 Error（例如「无法连接宿主服务」）。

---

## 3. 生词本数据层（负责人: vocab）

存储：与现有书籍同一个 IndexedDB（库名 `reader`），新增 object store `vocabulary`。
**数据库版本由 lead 统一升到 2 并在 `src/lib/store.js` 里建表**；vocab.js 直接复用 lead 提供的存储入口（见下）。

`src/lib/vocab.js`：

```js
/**
 * @typedef {object} VocabEntry
 * @property {string} id            // 规范化后的词（小写），主键
 * @property {string} word          // 原文形态
 * @property {string} bookId
 * @property {string} bookTitle
 * @property {string} sentence      // 收藏时的原句
 * @property {number} addedAt
 * @property {'learning'|'known'} state
 * @property {number} reviewCount
 * @property {number} lastReviewedAt
 * @property {number} nextReviewAt
 * @property {string} phonetic
 * @property {string} definition
 */

export async function listEntries();          // VocabEntry[]
export async function addEntry(entry);        // 幂等 upsert，返回最终条目
export async function removeEntry(id);         // void
export async function updateEntry(id, patch);  // 返回更新后的条目
export async function dueEntries(now = Date.now());  // nextReviewAt <= now
export function summarize(entries, now = Date.now());
// → { total, known, learning, toLearn, addedToday }
export function scheduleNext(entry, now = Date.now());  // 下次复习时间戳
```

规则：
- `id` = 词的小写形式（去掉首尾标点）。
- `addEntry` 幂等：已存在时只补 `phonetic`/`definition`（若原来为空），不重置 `addedAt`/`state`/`reviewCount`。
- `scheduleNext`：间隔重复 —— 复习次数 0→1 天，1→2 天，2→4 天，3→7 天，4→15 天，之后 30 天。
- `summarize`：`known` = state==='known'；`learning` = state==='learning' 且复习次数 ≥ 1；`toLearn` = 其余；`addedToday` = addedAt 在今天内。

---

## 4. UI（负责人: lead）

- `src/ui/wordcard.js`：点词弹出的词卡。
- `src/ui/wordlist.js`：生词本面板（负责人: vocab）。
- reader.js 里点词 = 打开词卡（现在只是朗读发音）。

---

## 5. 硬性约束

1. 纯 ESM、`.js`、无 JSX（用 `React.createElement`）。
2. 不加载任何 `@deepseek-ai/dsh-*` 客户端包。
3. 引擎层/解析层不依赖 React；生词本数据层不依赖 React。
4. 面向用户的文案用中文；AI 相关失败必须给出可读中文提示，不能抛原始英文堆栈。
5. 不得修改不属于自己写作用域的文件。
6. 测试用 `node --test tests/xxx.test.mjs`（本机 `node --test tests/` 目录形式会失败）。

---

## 6. MiniMax 直连通道（2026-11-07 修订，对应 task-1 A–I）

本节是对 §1 的补充，不改变 §1.3 冻结的返回结构，也不改变客户端读取 `status` 的方式。

### 6.1 Key 解析阶梯与缓存

`src/host/minimax.js` 不再只信任 `~/.dsh/reader/minimax.key`，按以下顺序找 Key，**每个候选先用一次免费探活请求校验**，第一个通过的胜出：

1. 环境变量 `MINIMAX_API_KEY`（`source: 'env'`）
2. 私有文件 `~/.dsh/reader/minimax.key`（可用 `READER_MINIMAX_KEY_FILE` 改路径，测试用）（`source: 'file'`）
3. 宿主 `credentials` 服务，按 ref 顺序 `MINIMAX_API_KEY` → `MINIMAX_CN_API_KEY` → `MYMINIMAX_API_KEY`（`source: 'credentials'`）

规则：

- 探活接口是 `POST /v1/get_voice {voice_type:'all'}`：免费、不消耗 token；失效 Key 在它上面返回 HTTP 200 + `base_resp.status_code = 2049`。
- 通过校验的 Key 与来源缓存在模块级 channel state 里，**TTL 10 分钟**；下一个请求直接读缓存，不会每次探活。
- 运行期遇到 401/403/2049：立即作废该 Key，同一请求内继续走阶梯的下一个来源；阶梯全部被拒时返回映射后的中文错误并进入冷却。
- 全阶梯都不可用时把「解析失败」负缓存 60 秒，避免每个请求都重新探活。

### 6.2 冷却（5 分钟）与回退

- 供应商侧确定性失败（401/403/2049、402/2067 额度、429、5xx、请求超时、模型下线 404/2069）→ channel 进入 **5 分钟冷却**，`lastFailure` 记住 `{code, status, providerCode, message}`。
- 冷却期内 `status.minimax = false`；AI 方法**直接跳过 MiniMax**，用宿主 `llm` 作答；TTS/voices/asr/cover 没有宿主回退路径，返回可执行中文错误（`MINIMAX_COOLDOWN`，带剩余秒数与最近失败原因）。
- 额度耗尽（`MINIMAX_QUOTA` / providerCode 2067）属于账号侧事实：充值或把新 Key 存进 credentials / key 文件后，下一步请求会按阶梯自动探到新 Key 并恢复，**不需要改代码、不需要重启应用**；恢复前 TTS 会持续返回该错误。
- AI 方法运行期 MiniMax 失败时：同一请求立刻改用宿主 `llm`（`runAiMethod` 内完成，不重发 HTTP）。宿主 llm 也失败时返回一条同时点名两个通道的中文错误：
  - Key 类失败 → `MiniMax Key 失效（…），宿主模型不可用（…）`，`details.code = AI_MINIMAX_KEY_INVALID`
  - 其他通道失败 → `MiniMax 通道不可用（…），宿主模型不可用（…）`，`details.code = AI_MINIMAX_UNAVAILABLE`
  - `details.details = { minimax: {code,status,providerCode}, llm: {code,message,provider,model,providerMessage} }`；原始 provider code/status 都保留。
- 宿主 `llm` 调用**不强制 temperature / reasoningEffort 以外的采样参数**：`reasoningEffort` 跟随 `agentDefaultModel.currentSelection()`，temperature 交给路由默认（reasoning 路由可能只接受自己的温度，例如 k3 对非 1 温度回 400）。

### 6.2.1 宿主 `llm` 的会话标识（2026-11-07 追加）

插件从浏览器的 fetch 路由调用宿主 `llm`，这条路径上没有 Agent 轮次，也就没有 session id。按 session 路由的 provider（当前默认模型 `opencode-go` 就是一个）会直接拒绝这种请求：

```
400 {"type":"MissingSessionID","message":"Request is missing x-opencode-session and cannot be routed efficiently."}
```

所以 `src/host/ai.js` 在 stream 请求里带一个**进程级的稳定合成 id**（`reader-assist-<uuid>`，模块加载时生成一次，所有请求复用）。`prepared.stream()` 的 config 校验不比较 `sessionId`，所以它能安全地挂在 prepared 请求上。不要在每次请求里新生成 id：那会让每次查词落到一个新的路由桶里。

验收：默认模型为 `opencode-go/deepseek-v4.1-flash`、MiniMax 额度耗尽（402/2067）时，`word`/`translate`/`breakdown`/`mindmap`/`podcast` 仍通过宿主模型返回 `ok`（实测 5.6s / 3.1s / 10.5s / 13.8s / 34.6s）。

### 6.3 模型

- `CHAT_MODEL = 'MiniMax-M3.1-Flash'`（`MiniMax-Text-01` 已被供应商下线，404/2069）。
- `TTS_MODEL = 'speech-02-hd'`，`ASR_MODEL = 'asr-1.0'`，`IMAGE_MODEL = 'image-01'`。
- ASR 的浏览器录音先经 `src/host/audio.js` 转为 16kHz / mono / PCM16 WAV（ffmpeg；RIFF/WAV 直接透传），再以 `audio/wav` 提交 `/speech_to_text`。MiniMax 不支持 `matroska/webm`（2013），不能直接上传 MediaRecorder 的 WebM。
- 每个 AI 方法的请求预算：word 60s、translate/breakdown/mindmap 90s、podcast 180s、podcastReply 120s；`deps.timeoutMs` 仍可覆盖。回退到宿主 reasoning 模型时单次生成可能接近 60s（实测 translate 52s），预算按最慢回退路径留足。

### 6.4 `status` 契约（客户端字段不变，新字段可忽略）

```js
{
  minimax: boolean,            // Key 通过探活且通道不在冷却
  source: 'env' | 'file' | 'credentials' | 'none',
  chatModel: string,           // 真实在用的型号，不再谎报 MiniMax-Text-01
  ttsModel: string,
  reason?: string,             // 不可用时的人话原因（Key 不可用 / 探活不可达 / 冷却中）
}
```

### 6.5 错误映射

| 供应商事实 | `code` | 中文提示（节选） |
|---|---|---|
| 401/403、`authorized_error`、body 2049/1004 | `MINIMAX_INVALID_KEY` | MiniMax API Key 无效或已失效，请更新 MINIMAX_API_KEY |
| 402、`insufficient_balance_error`、body 2067/1008 | `MINIMAX_QUOTA` | MiniMax 账户额度已用尽（Token Plan 用量上限或余额不足），请充值或更换 API Key |
| 429、`rate_limit_error`、body 1002 | `MINIMAX_RATE_LIMIT` | MiniMax 请求频率超限，请稍后再试 |
| 404 模型下线、body 2069 | `MINIMAX_MODEL_UNAVAILABLE` | MiniMax 模型不可用（模型名可能已下线），请更新模型配置 |
| 5xx、body 1013 | `MINIMAX_UNAVAILABLE` | MiniMax 服务暂时不可用，请稍后再试 |
| 超时 / 网络不可达 | `MINIMAX_TIMEOUT` / `MINIMAX_NETWORK` | MiniMax 请求超时（n 秒）/ 无法连接 MiniMax 服务 |
| 冷却期 | `MINIMAX_COOLDOWN` | MiniMax 通道临时不可用（最近失败：…）；约 n 秒后自动恢复 |

### 6.6 测试

```bash
cd reader
node --max-old-space-size=2048 --test tests/ai.test.mjs tests/minimax.test.mjs
node --max-old-space-size=2048 --test "tests/*.test.mjs"   # Node 22 必须显式 glob
```

`tests/minimax.test.mjs` 全程用假 fetch + 独立 channel state，不触网；覆盖阶梯、探活、TTL 缓存、运行期换 Key、冷却、错误映射、TTS/voices/asr/cover。`tests/ai.test.mjs` 覆盖 MiniMax 优先、401/404 回退宿主 llm、双通道失败文案与 details、冷却跳过、JSON 重试、status 路由。

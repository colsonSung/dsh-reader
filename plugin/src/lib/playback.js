/**
 * 朗读播放层：把「读哪一段、读几遍、读多久」变成可以单测的纯逻辑。
 *
 * 朗读范围（段落 / 章 / 全书）、循环次数、以及「读满 N 分钟就停」都是规则，
 * 与界面无关：界面只负责显示设置和触发动作。因此这一层刻意不碰 React、
 * 不碰任何浏览器 API，时间也通过 options.now 注入。放在纯模块里，就能在
 * Node 里用假数据把每一条规则跑一遍 —— 不用开浏览器，也不用真的出声，
 * 单元测试因此可以在 CI 上稳定地跑。
 *
 * 纯 ESM，不依赖 React，不依赖 DOM。
 */

/** 朗读范围：当前段落 / 当前章 / 整本书。 */
export const PLAYBACK_SCOPES = Object.freeze(['paragraph', 'chapter', 'book']);

/**
 * 把任意输入变成有限非负整数：非法值按 0 处理。
 *
 * @param {any} value
 * @returns {number}
 */
function toCount(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.trunc(num));
}

/**
 * 取段落的章标识。章号可能是数字也可能是字符串，统一成字符串再比较。
 *
 * @param {any} paragraph
 * @returns {string}
 */
function chapterKey(paragraph) {
  const index = paragraph && paragraph.chapterIndex !== undefined ? paragraph.chapterIndex : 0;
  return String(index);
}

/**
 * 把一段落里的句子摊平成一个词表，并给出每句在词表里的起点。
 *
 * 句与句之间用一个空格拼起来，所以词的 start/end 是拼好之后的整段文本里的
 * 字符偏移：text.slice(word.start, word.end) === word.text 一定成立。
 * sentenceStart 是每句第一个词在词表里的下标（与 UI 的 flattenParagraph 一致）。
 *
 * 句子本身为空或缺失时照样占一位（只是没有词），这样偏移与词表始终对齐。
 *
 * @param {object[]} units 全书的逐句单元
 * @param {number[]} unitIndexes 这一段落对应的单元下标
 * @returns {{ words: {text:string,start:number,end:number,sentencePosition:number}[], sentenceStart: number[], text: string }}
 */
export function flattenUnits(units, unitIndexes) {
  const list = Array.isArray(units) ? units : [];
  const indexes = Array.isArray(unitIndexes) ? unitIndexes : [];
  const words = [];
  const sentenceStart = [];
  const texts = [];
  let base = 0;

  indexes.forEach((rawIndex, sentencePosition) => {
    const unit = list[toCount(rawIndex)];
    const unitText =
      unit && typeof unit.text === 'string' ? unit.text : unit && unit.text != null ? String(unit.text) : '';
    sentenceStart.push(words.length);
    const unitWords = unit && Array.isArray(unit.words) ? unit.words : [];
    unitWords.forEach((word) => {
      if (word === undefined || word === null) return;
      const start = Number.isFinite(word.start) ? word.start : 0;
      const end = Number.isFinite(word.end) ? word.end : start;
      words.push({
        text: typeof word.text === 'string' ? word.text : word.text != null ? String(word.text) : '',
        start: base + start,
        end: base + end,
        sentencePosition,
      });
    });
    base += unitText.length + 1; // 句尾补一个空格
    texts.push(unitText);
  });

  return { words, sentenceStart, text: texts.join(' ') };
}

/**
 * 解析这一次朗读要覆盖哪些段落。
 *
 * scope 'paragraph' -> 只有 startParagraphIndex 那一段
 * scope 'chapter'  -> startParagraphIndex 所在章的全部段落（书的先后顺序）
 * scope 'book'     -> 全书的全部段落
 *
 * 空段落（没有文本或只有空白）会被跳过：读它等于什么都没读。
 * 未知的 scope 退回 'paragraph'，越界的 startParagraphIndex 从第 0 段开始。
 *
 * @param {{ paragraphs: object[], units: object[], scope: string, startParagraphIndex: number }} input
 * @returns {{ key:string, paragraphIndex:number, chapterIndex:number, chapterTitle:string,
 *             unitIndexes:number[], text:string, words:{text:string,start:number,end:number,sentencePosition:number}[],
 *             sentenceStart:number[], wordCount:number }[]}
 */
export function resolveSegments({ paragraphs, units, scope, startParagraphIndex } = {}) {
  const list = Array.isArray(paragraphs) ? paragraphs : [];
  if (list.length === 0) return [];
  const unitList = Array.isArray(units) ? units : [];
  const resolvedScope = PLAYBACK_SCOPES.includes(scope) ? scope : 'paragraph';
  // 越界的起点退回第 0 段：与其读到不存在的段落，不如从头开始。
  const requested = toCount(startParagraphIndex);
  const startIndex = requested < list.length ? requested : 0;

  // 选中的段落在段落表里的下标，按书的先后顺序。
  const indexes = [];
  if (resolvedScope === 'book') {
    for (let index = 0; index < list.length; index += 1) indexes.push(index);
  } else if (resolvedScope === 'chapter') {
    const wanted = chapterKey(list[startIndex]);
    list.forEach((paragraph, index) => {
      if (chapterKey(paragraph) === wanted) indexes.push(index);
    });
  } else {
    indexes.push(startIndex);
  }

  const segments = [];
  indexes.forEach((index) => {
    const paragraph = list[index];
    if (paragraph === undefined || paragraph === null) return;
    const unitIndexes = Array.isArray(paragraph.unitIndexes) ? paragraph.unitIndexes.slice() : [];
    const flat = flattenUnits(unitList, unitIndexes);
    if (flat.text.trim() === '') return; // 空段落没有可读的内容
    const rawChapter = Number(paragraph.chapterIndex);
    const chapterIndex = Number.isFinite(rawChapter) ? rawChapter : 0;
    segments.push({
      key:
        typeof paragraph.key === 'string' && paragraph.key !== ''
          ? paragraph.key
          : `${chapterIndex}:${index}`,
      paragraphIndex: index,
      chapterIndex,
      chapterTitle: typeof paragraph.chapterTitle === 'string' ? paragraph.chapterTitle : '',
      unitIndexes,
      text: flat.text,
      words: flat.words,
      sentenceStart: flat.sentenceStart,
      wordCount: flat.words.length,
    });
  });
  return segments;
}

/**
 * 刚读完一段之后，下一步是什么。
 *
 * pass 是这一轮（当前第几遍）的序号，从 0 开始。
 * loop 为 false 时整段范围只读一遍；loop 为 true 且 loopCount 为 0 时读到
 * 学习者停为止；loop 为 true 且 loopCount 大于 0 时总共读 loopCount 遍。
 *
 * @param {{ segmentIndex:number, segmentCount:number, pass:number, loop:boolean, loopCount:number }} state
 * @returns {{ segmentIndex:number, pass:number, done:boolean, reason:'next'|'finished'|'ended' }}
 */
export function nextStep({ segmentIndex, segmentCount, pass, loop, loopCount } = {}) {
  const count = toCount(segmentCount);
  const current = toCount(segmentIndex);
  const currentPass = toCount(pass);
  const total = toCount(loopCount);

  if (count === 0) {
    // 没有可读的内容：范围是空的，没什么可继续的。
    return { segmentIndex: current, pass: currentPass, done: true, reason: 'ended' };
  }

  if (current < count - 1) {
    return { segmentIndex: current + 1, pass: currentPass, done: false, reason: 'next' };
  }

  // 这一轮的最后一个段落读完了。
  if (loop !== true) {
    return { segmentIndex: current, pass: currentPass, done: true, reason: 'finished' };
  }
  if (total > 0 && currentPass + 1 >= total) {
    // 遍数用完。
    return { segmentIndex: current, pass: currentPass, done: true, reason: 'finished' };
  }
  // 无限循环，或者还有下一遍要读。
  return { segmentIndex: 0, pass: currentPass + 1, done: false, reason: 'next' };
}

/**
 * 「读满 N 分钟就停」的计时器。
 *
 * limitMs 小于等于 0 表示不限时：expired() 永远是 false，remaining() 是 Infinity。
 * start() 开始计时，reset() 清掉起点（计时也就随之停下，直到再次 start()）。
 *
 * 时间来自 options.now，测试可以冻结它；没有注入时退回 Date.now()。
 *
 * @param {{ now?: () => number, limitMs?: number }} [options]
 * @returns {{ start: () => void, reset: () => void, elapsed: () => number, expired: () => boolean, remaining: () => number, limitMs: number }}
 */
export function createDeadline({ now, limitMs } = {}) {
  const clock = typeof now === 'function' ? now : () => Date.now();
  const rawLimit = Number(limitMs);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 0;
  let startedAt = null;

  /** @returns {number} 已经过去多少毫秒 */
  function elapsed() {
    if (startedAt === null) return 0;
    const value = clock() - startedAt;
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  /** @returns {boolean} 是否已经超时 */
  function expired() {
    if (limit <= 0) return false;
    return elapsed() >= limit;
  }

  /** @returns {number} 还剩多少毫秒；不限时是 Infinity */
  function remaining() {
    if (limit <= 0) return Infinity;
    return Math.max(0, limit - elapsed());
  }

  /** 开始计时：已经在计时时不重置起点，避免误触丢掉已读的时间。 */
  function start() {
    if (startedAt === null) startedAt = clock();
  }

  /** 清掉起点：elapsed() 回到 0，计时停下，直到再次 start()。 */
  function reset() {
    startedAt = null;
  }

  return { limitMs: limit, start, reset, elapsed, expired, remaining };
}

/**
 * 把一组朗读设置翻译成界面能直接用的描述。
 *
 * passes 是要读几遍（无限循环时是 Infinity），unlimited 表示读到学习者停为止，
 * limitMs 是「读满 N 分钟就停」的毫秒数（0 表示不限时）。
 *
 * @param {{ loop:boolean, loopCount:number, limitMinutes:number }} settings
 * @returns {{ passes:number, unlimited:boolean, limitMs:number }}
 */
export function describePlayback(settings) {
  const input = settings && typeof settings === 'object' ? settings : {};
  const looping = input.loop === true;
  const total = toCount(input.loopCount);
  const minutes = Number(input.limitMinutes);
  const limit = Number.isFinite(minutes) && minutes > 0 ? minutes * 60000 : 0;
  return {
    passes: looping ? (total === 0 ? Infinity : total) : 1,
    unlimited: looping && total === 0,
    limitMs: limit,
  };
}

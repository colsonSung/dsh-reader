/**
 * 朗读播放层单元测试。
 *
 * 覆盖：
 *   - flattenUnits：句子用一个空格拼起来、词偏移能还原原文
 *   - resolveSegments：三种范围、空段落跳过、非法输入退回
 *   - nextStep：一遍读完、有限次循环、无限循环、空范围
 *   - createDeadline：不限时、超时、reset、remaining
 *   - describePlayback：三种设置
 *
 * 运行：node --test tests/playback.test.mjs
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PLAYBACK_SCOPES,
  createDeadline,
  describePlayback,
  flattenUnits,
  nextStep,
  resolveSegments,
} from '../src/lib/playback.js';
import { buildUnits } from '../src/shared/segment.js';

/**
 * 按章与段把单元聚成段落 —— 与 UI 的 groupParagraphs 同一套形状。
 *
 * @param {object[]} units
 * @returns {{ key:string, chapterIndex:number, chapterTitle:string, unitIndexes:number[] }[]}
 */
function groupParagraphs(units) {
  const paragraphs = [];
  let current = null;
  units.forEach((unit, unitIndex) => {
    const key = `${unit.chapterIndex}:${unit.paragraphIndex}`;
    if (current === null || current.key !== key) {
      current = {
        key,
        chapterIndex: unit.chapterIndex,
        chapterTitle: unit.chapterTitle,
        unitIndexes: [],
      };
      paragraphs.push(current);
    }
    current.unitIndexes.push(unitIndex);
  });
  return paragraphs;
}

/** 两章四段的小书：第 0 章两段，第 1 章两段。 */
const CHAPTERS = [
  {
    title: 'Chapter One',
    paragraphs: ['Mr. Smith went home. He slept well.', 'Then he woke up.'],
  },
  {
    title: 'Chapter Two',
    paragraphs: ['She left the house.', 'The door closed behind her.'],
  },
];

const UNITS = buildUnits(CHAPTERS);
const PARAGRAPHS = groupParagraphs(UNITS);

/** 冻结的时钟：测试自己推进时间。 */
function createClock(start = 0) {
  let value = start;
  return {
    now: () => value,
    advance(ms) {
      value += ms;
    },
  };
}

// --------------------------------------------------------------- flattenUnits

test('playback: PLAYBACK_SCOPES 是冻结的三种范围', () => {
  assert.deepEqual([...PLAYBACK_SCOPES], ['paragraph', 'chapter', 'book']);
  assert.equal(Object.isFrozen(PLAYBACK_SCOPES), true);
});

test('playback: flattenUnits 句子用一个空格拼起来，词偏移能还原原文', () => {
  const flat = flattenUnits(UNITS, [0, 1]);
  assert.equal(flat.text, 'Mr. Smith went home. He slept well.');
  assert.equal(flat.text.includes('  '), false, '句子之间只能有一个空格');
  assert.equal(flat.words.length, 7);
  assert.deepEqual(flat.sentenceStart, [0, 4]);
  for (const word of flat.words) {
    assert.equal(flat.text.slice(word.start, word.end), word.text);
  }
  // 第二句的第一个词紧跟在第一句加一个空格之后
  const he = flat.words[4];
  assert.equal(he.text, 'He');
  assert.equal(he.start, 'Mr. Smith went home. '.length);
  assert.equal(he.sentencePosition, 1);
  assert.equal(flat.words[0].sentencePosition, 0);
  assert.equal(flat.words[0].text, 'Mr.');
});

test('playback: flattenUnits 空输入返回空结果', () => {
  assert.deepEqual(flattenUnits(UNITS, []), { words: [], sentenceStart: [], text: '' });
  assert.deepEqual(flattenUnits(undefined, undefined), { words: [], sentenceStart: [], text: '' });
  // 下标越界的单元当作空句子：词表为空，但位置仍然占着
  const flat = flattenUnits(UNITS, [99]);
  assert.deepEqual(flat.words, []);
  assert.deepEqual(flat.sentenceStart, [0]);
});

// ------------------------------------------------------------ resolveSegments

test('playback: resolveSegments 段落范围只返回那一段', () => {
  const segments = resolveSegments({
    paragraphs: PARAGRAPHS,
    units: UNITS,
    scope: 'paragraph',
    startParagraphIndex: 0,
  });
  assert.equal(segments.length, 1);
  const segment = segments[0];
  assert.equal(segment.key, '0:0');
  assert.equal(segment.paragraphIndex, 0);
  assert.equal(segment.chapterIndex, 0);
  assert.equal(segment.chapterTitle, 'Chapter One');
  assert.deepEqual(segment.unitIndexes, [0, 1]);
  assert.equal(segment.text, 'Mr. Smith went home. He slept well.');
  assert.equal(segment.wordCount, 7);
  assert.equal(segment.words.length, 7);
  assert.deepEqual(segment.sentenceStart, [0, 4]);
});

test('playback: resolveSegments 章节范围只返回本章的段落，按书的顺序', () => {
  const segments = resolveSegments({
    paragraphs: PARAGRAPHS,
    units: UNITS,
    scope: 'chapter',
    startParagraphIndex: 0,
  });
  assert.deepEqual(segments.map((s) => s.key), ['0:0', '0:1']);
  assert.deepEqual(segments.map((s) => s.paragraphIndex), [0, 1]);
  assert.ok(segments.every((s) => s.chapterIndex === 0));

  // 从第二章开始，返回的是第二章的两段
  const second = resolveSegments({
    paragraphs: PARAGRAPHS,
    units: UNITS,
    scope: 'chapter',
    startParagraphIndex: 2,
  });
  assert.deepEqual(second.map((s) => s.key), ['1:0', '1:1']);
  assert.ok(second.every((s) => s.chapterTitle === 'Chapter Two'));
});

test('playback: resolveSegments 全书范围返回每一个段落', () => {
  const segments = resolveSegments({
    paragraphs: PARAGRAPHS,
    units: UNITS,
    scope: 'book',
    startParagraphIndex: 0,
  });
  assert.deepEqual(segments.map((s) => s.key), ['0:0', '0:1', '1:0', '1:1']);
  assert.deepEqual(segments.map((s) => s.paragraphIndex), [0, 1, 2, 3]);
  assert.deepEqual(segments.map((s) => s.wordCount), [7, 4, 4, 5]);
  for (const segment of segments) {
    for (const word of segment.words) {
      assert.equal(segment.text.slice(word.start, word.end), word.text);
    }
  }
});

test('playback: resolveSegments 空段落被跳过', () => {
  const units = [
    { id: 'u0', text: 'Hello there.', words: [{ text: 'Hello', start: 0, end: 5 }, { text: 'there.', start: 6, end: 12 }], chapterIndex: 0, chapterTitle: 'C', paragraphIndex: 0 },
    { id: 'u1', text: '   ', words: [], chapterIndex: 0, chapterTitle: 'C', paragraphIndex: 1 },
    { id: 'u2', text: '', words: [], chapterIndex: 0, chapterTitle: 'C', paragraphIndex: 2 },
  ];
  const paragraphs = [
    { key: '0:0', chapterIndex: 0, chapterTitle: 'C', unitIndexes: [0] },
    { key: '0:1', chapterIndex: 0, chapterTitle: 'C', unitIndexes: [1] },
    { key: '0:2', chapterIndex: 0, chapterTitle: 'C', unitIndexes: [2] },
    { key: '0:3', chapterIndex: 0, chapterTitle: 'C', unitIndexes: [] },
  ];
  const segments = resolveSegments({ paragraphs, units, scope: 'book', startParagraphIndex: 0 });
  assert.deepEqual(segments.map((s) => s.key), ['0:0']);
  assert.equal(segments[0].text, 'Hello there.');
  assert.equal(segments[0].wordCount, 2);
});

test('playback: resolveSegments 未知范围退回段落范围', () => {
  const segments = resolveSegments({
    paragraphs: PARAGRAPHS,
    units: UNITS,
    scope: 'galaxy',
    startParagraphIndex: 1,
  });
  assert.equal(segments.length, 1);
  assert.equal(segments[0].key, '0:1');
  assert.equal(segments[0].paragraphIndex, 1);
});

test('playback: resolveSegments 起点越界时从第 0 段开始', () => {
  const segments = resolveSegments({
    paragraphs: PARAGRAPHS,
    units: UNITS,
    scope: 'paragraph',
    startParagraphIndex: 99,
  });
  assert.equal(segments.length, 1);
  assert.equal(segments[0].key, '0:0');
  assert.equal(segments[0].paragraphIndex, 0);
});

test('playback: resolveSegments 没有段落时返回空数组', () => {
  assert.deepEqual(
    resolveSegments({ paragraphs: [], units: UNITS, scope: 'book', startParagraphIndex: 0 }),
    []
  );
  assert.deepEqual(resolveSegments(), []);
});

// ------------------------------------------------------------------- nextStep

test('playback: nextStep 一遍之内往下走', () => {
  const step = nextStep({
    segmentIndex: 0,
    segmentCount: 3,
    pass: 0,
    loop: false,
    loopCount: 0,
  });
  assert.deepEqual(step, { segmentIndex: 1, pass: 0, done: false, reason: 'next' });
});

test('playback: nextStep 不循环时读完最后一段就结束', () => {
  const step = nextStep({
    segmentIndex: 1,
    segmentCount: 2,
    pass: 0,
    loop: false,
    loopCount: 0,
  });
  assert.equal(step.done, true);
  assert.equal(step.reason, 'finished');
});

test('playback: nextStep loopCount 3 时两段的范围一共读三遍', () => {
  let segmentIndex = 0;
  let pass = 0;
  const visited = [];
  for (let guard = 0; guard < 100; guard += 1) {
    visited.push(`${pass}:${segmentIndex}`);
    const step = nextStep({
      segmentIndex,
      segmentCount: 2,
      pass,
      loop: true,
      loopCount: 3,
    });
    if (step.done) {
      assert.equal(step.reason, 'finished');
      break;
    }
    segmentIndex = step.segmentIndex;
    pass = step.pass;
  }
  assert.deepEqual(visited, ['0:0', '0:1', '1:0', '1:1', '2:0', '2:1']);
});

test('playback: nextStep loopCount 为 0 时无限循环', () => {
  const step = nextStep({
    segmentIndex: 1,
    segmentCount: 2,
    pass: 7,
    loop: true,
    loopCount: 0,
  });
  assert.deepEqual(step, { segmentIndex: 0, pass: 8, done: false, reason: 'next' });
});

test('playback: nextStep 范围为空时结束', () => {
  const step = nextStep({
    segmentIndex: 0,
    segmentCount: 0,
    pass: 0,
    loop: true,
    loopCount: 0,
  });
  assert.equal(step.done, true);
  assert.equal(step.reason, 'ended');
});

// -------------------------------------------------------------- createDeadline

test('playback: createDeadline 不限时永远不过期', () => {
  const clock = createClock();
  const deadline = createDeadline({ now: clock.now, limitMs: 0 });
  deadline.start();
  clock.advance(10 * 60 * 1000);
  assert.equal(deadline.expired(), false);
  assert.equal(deadline.remaining(), Infinity);
  assert.equal(deadline.limitMs, 0);
});

test('playback: createDeadline 一分钟限时在 60 秒后过期', () => {
  const clock = createClock(1000);
  const deadline = createDeadline({ now: clock.now, limitMs: 60000 });
  deadline.start();
  clock.advance(59999);
  assert.equal(deadline.expired(), false);
  assert.equal(deadline.elapsed(), 59999);
  assert.equal(deadline.remaining(), 1);
  clock.advance(1);
  assert.equal(deadline.expired(), true);
  assert.equal(deadline.remaining(), 0);
});

test('playback: createDeadline reset 清掉计时', () => {
  const clock = createClock();
  const deadline = createDeadline({ now: clock.now, limitMs: 60000 });
  deadline.start();
  clock.advance(30000);
  assert.equal(deadline.elapsed(), 30000);
  deadline.reset();
  assert.equal(deadline.elapsed(), 0);
  assert.equal(deadline.expired(), false);
  clock.advance(30000);
  assert.equal(deadline.elapsed(), 0, 'reset 之后不再继续计时');
  deadline.start();
  clock.advance(1000);
  assert.equal(deadline.elapsed(), 1000, '再次 start 之后重新计时');
});

test('playback: createDeadline 没有 start 时不算时间', () => {
  const clock = createClock();
  const deadline = createDeadline({ now: clock.now, limitMs: 1000 });
  clock.advance(5000);
  assert.equal(deadline.elapsed(), 0);
  assert.equal(deadline.expired(), false);
  assert.equal(deadline.remaining(), 1000);
});

// ----------------------------------------------------------- describePlayback

test('playback: describePlayback 三种设置', () => {
  assert.deepEqual(describePlayback({ loop: false, loopCount: 0, limitMinutes: 0 }), {
    passes: 1,
    unlimited: false,
    limitMs: 0,
  });
  assert.deepEqual(describePlayback({ loop: true, loopCount: 3, limitMinutes: 10 }), {
    passes: 3,
    unlimited: false,
    limitMs: 600000,
  });
  assert.deepEqual(describePlayback({ loop: true, loopCount: 0, limitMinutes: 0 }), {
    passes: Infinity,
    unlimited: true,
    limitMs: 0,
  });
});

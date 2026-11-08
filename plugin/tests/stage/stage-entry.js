/**
 * The reader rendering stage — browser entry.
 *
 * This file is not part of the plugin: it exists so the ReaderView can be
 * mounted in a plain page, in headless Chrome, and inspected without the
 * Harness shell. It imports the real plugin sources (the same ReaderView the
 * page renders and the same stylesheet it ships), feeds them the English
 * dictionary the client entry registers, and mounts them inside an
 * `.er-page` root — the container the container queries in `styles.js`
 * measure against.
 *
 * The URL decides what is rendered:
 *
 *   ?mode=listen|type|speak   which practice mode is selected after mount
 *   ?phone=1                  narrow 390px page (run it with a 390px window)
 *
 * Once the frame has settled a JSON probe is written into
 * `<pre id="probe">` (hidden, so it never pollutes the screenshot) and
 * `run.mjs` reads it back from `--dump-dom`.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { apply } from '../../src/client-entry.js';
import { ReaderView } from '../../src/ui/reader.js';
import { STYLE } from '../../src/ui/styles.js';

/* ------------------------------------------------------------------ errors */

/** Everything that went wrong, so a broken render is visible instead of blank. */
const consoleErrors = [];
window.addEventListener('error', (event) => {
  consoleErrors.push('error: ' + (event.message ?? String(event.error ?? 'unknown')));
});
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  consoleErrors.push('unhandledrejection: ' + (reason && reason.message ? reason.message : String(reason)));
});
const nativeConsoleError = console.error.bind(console);
console.error = (...args) => {
  consoleErrors.push(args.map((value) => {
    if (typeof value === 'string') return value;
    if (value instanceof Error) return value.message;
    try { return JSON.stringify(value); } catch (error) { return String(value); }
  }).join(' '));
  nativeConsoleError(...args);
};

/* ------------------------------------------------------------------ styles */

const style = document.createElement('style');
style.textContent = STYLE;
document.head.appendChild(style);

/* -------------------------------------------------------------- dictionary */

/*
 * The plugin registers its dictionaries through the client context; calling
 * `apply` with a mock context is how the unit tests get them, and it is how
 * the stage gets real English labels instead of raw keys like
 * `reader.modeType`.
 */
const dictionaries = [];
const ctx = {
  locale: {
    register: (ns, dicts) => { dictionaries.push(dicts); },
    bind: () => (key) => key,
  },
  slots: {
    inject: (key, callback) => callback(),
    register: () => {},
  },
  effect: (callback) => callback(),
  on: () => () => {},
  get: () => undefined,
};
try {
  apply(ctx);
} catch (error) {
  consoleErrors.push('apply: ' + (error && error.message ? error.message : String(error)));
}
// ctx.locale.register receives { en, zh }; the stage speaks English.
const dictionary = (dictionaries[0] ?? {}).en ?? {};
const t = (key) => {
  const value = dictionary[key];
  return typeof value === 'string' ? value : key;
};

/* ---------------------------------------------------------------- fixtures */

/**
 * Split a sentence into the word records the reader expects.
 * @param {string} text
 * @returns {{text: string, clean: string, start: number, end: number}[]}
 */
function wordsOf(text) {
  const words = [];
  const pattern = /\S+/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const raw = match[0];
    const start = match.index;
    words.push({
      text: raw,
      clean: raw.toLowerCase().replace(/[^a-z0-9']/g, ''),
      start,
      end: start + raw.length,
    });
  }
  return words;
}

/** Four English paragraphs, four to six sentences each. */
const PARAGRAPHS = [
  [
    'The brass lantern sat on the workbench, still warm from the polishing wheel.',
    'Mara turned it once and watched the light crawl along the seam.',
    'It was the last piece her teacher had shaped before the workshop closed.',
    'She set it down beside the ledger and opened the shutters.',
    'Morning came in slowly, the way it does when the street is still asleep.',
  ],
  [
    'Outside, the market carts were already rattling over the cobbles.',
    'A boy with a cracked bell called the hours for anyone who still kept count.',
    'Mara had learned to tell the time by the sound of the bell instead.',
    'She wrote the hour in the ledger anyway, in ink that had not dried.',
  ],
  [
    'The ledger recorded every lamp the workshop had sold, and the price of each.',
    'Some pages were dense with numbers; others held only a name and a date.',
    'Mara found her teacher\'s handwriting on the oldest page, small and careful.',
    'It listed a lantern sold to a harbour master two hundred years before.',
    'The price was written in a coin nobody used anymore.',
    'She closed the book and ran her thumb along its worn spine.',
  ],
  [
    'By noon the shutters were open and the first customer of the day arrived.',
    'He wanted a lamp that would burn through a long voyage.',
    'Mara showed him three, then a fourth she had been saving.',
    'He chose the plainest one and paid without haggling.',
  ],
];

/** Every sentence of the fixture book, in reading order. */
const units = [];
let unitId = 0;
PARAGRAPHS.forEach((sentences, paragraphIndex) => {
  sentences.forEach((text, sentenceIndex) => {
    unitId += 1;
    units.push({
      id: 'stage-u' + unitId,
      chapterIndex: 0,
      chapterTitle: 'Chapter One: The Brass Lantern',
      paragraphIndex,
      sentenceIndex,
      text,
      words: wordsOf(text),
    });
  });
});

const book = {
  id: 'stage-book',
  title: 'The Brass Lantern',
  author: 'Stage Fixture',
  format: 'txt',
};

/* ------------------------------------------------------------------- mount */

const params = new URLSearchParams(window.location.search);

// Headless Chrome freezes CSS transitions under a virtual time budget, so a
// screenshot can paint the state before the last click. The stage can drop
// transitions for a capture; the probe still reads the real computed styles.
// Headless Chrome clamps a window to 500px wide, so a 390px window renders a
// 500px page and the screenshot (390 wide) crops it. Pinning the document to
// the phone width makes the 390px shot show the real layout.
if (phone) {
  document.documentElement.style.width = '390px';
  document.body.style.width = '390px';
}

if (params.get('notrans') === '1') {
  const style = document.createElement('style');
  style.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}';
  document.head.appendChild(style);
}
const requestedMode = (params.get('mode') ?? 'listen').toLowerCase();
const phone = params.get('phone') === '1';

/** Label of the mode button to press, taken from the real dictionary. */
const MODE_LABELS = {
  listen: 'reader.modeListen',
  type: 'reader.modeType',
  speak: 'reader.modeSpeak',
};

/**
 * Click the mode chip whose label is the requested mode. The row is visually
 * hidden in the immersive layout but stays in the DOM; a programmatic click is
 * how a learner would reach it through the mode menu.
 * @param {string} mode
 * @returns {boolean} whether a button was found
 */
function pressMode(mode) {
  if (mode === 'listen') return true;
  const label = t(MODE_LABELS[mode]);
  const chips = Array.from(document.querySelectorAll('.er-mode-chips .er-mode'));
  const target = chips.find((chip) => (chip.textContent ?? '').trim() === label)
    ?? chips.find((chip) => (chip.textContent ?? '').includes(label))
    ?? chips[{ type: 1, speak: 2 }[mode] ?? 0];
  if (!target) {
    consoleErrors.push('mode button not found for ' + mode);
    return false;
  }
  target.click();
  return true;
}

/* ------------------------------------------------------------------- probe */

/**
 * Round a number to two decimals so the JSON stays readable.
 * @param {number} value
 * @returns {number}
 */
function round(value) {
  return Math.round(value * 100) / 100;
}

/**
 * @param {DOMRect} rect
 * @returns {{x: number, y: number, w: number, h: number, top: number, right: number, bottom: number, left: number}}
 */
function rectOf(rect) {
  return {
    x: round(rect.x),
    y: round(rect.y),
    w: round(rect.width),
    h: round(rect.height),
    top: round(rect.top),
    right: round(rect.right),
    bottom: round(rect.bottom),
    left: round(rect.left),
  };
}

/**
 * The style facts a layout bug is usually visible in.
 * @param {Element} element
 * @returns {object}
 */
function styleOf(element) {
  const computed = window.getComputedStyle(element);
  return {
    position: computed.position,
    display: computed.display,
    opacity: computed.opacity,
    visibility: computed.visibility,
    zIndex: computed.zIndex,
    pointerEvents: computed.pointerEvents,
    transform: computed.transform,
    backgroundColor: computed.backgroundColor,
  };
}

/**
 * Whether an element is actually on screen: in the layout, not transparent,
 * inside the viewport and carrying some content.
 * @param {Element|null} element
 * @returns {boolean}
 */
function isVisible(element) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const computed = window.getComputedStyle(element);
  if (computed.display === 'none') return false;
  if (computed.visibility === 'hidden' || computed.visibility === 'collapse') return false;
  if (Number(computed.opacity) === 0) return false;
  if (rect.bottom <= 0 || rect.top >= window.innerHeight) return false;
  if (rect.right <= 0 || rect.left >= window.innerWidth) return false;
  if ((element.textContent ?? '').trim() === '') return false;
  return true;
}

/**
 * @param {DOMRect} a
 * @param {DOMRect} b
 * @returns {{width: number, height: number, area: number}}
 */
function intersection(a, b) {
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return { width: round(width), height: round(height), area: round(width * height) };
}

/**
 * Clip a rect to the box of the scroll container that holds it. The paragraph
 * boxes live inside `.er-read-body`, which has `overflow: auto`; a paragraph
 * that is scrolled past the container's edge is not on screen, so its raw
 * client rect must not count as covered text.
 * @param {DOMRect} rect
 * @param {DOMRect|null} clip
 * @returns {{left: number, top: number, right: number, bottom: number, width: number, height: number}}
 */
function clipRect(rect, clip) {
  if (clip === null) {
    return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
  }
  const left = Math.max(rect.left, clip.left);
  const top = Math.max(rect.top, clip.top);
  const right = Math.min(rect.right, clip.right);
  const bottom = Math.min(rect.bottom, clip.bottom);
  return { left, top, right, bottom, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

/**
 * Where a control sits relative to the bar it belongs to.
 * @param {Element|null} element
 * @returns {string}
 */
function labelOf(element) {
  if (!element) return '';
  const text = (element.textContent ?? '').trim().replace(/\s+/g, ' ');
  if (text !== '') return text;
  return element.getAttribute('aria-label') ?? element.getAttribute('title') ?? '';
}

/**
 * Build the probe the runner reads back.
 * @returns {object}
 */
function buildProbe() {
  const selectors = [
    '.er-read-foot',
    '.er-mode-dock',
    '.er-reading-page',
    '.er-reading-scroll',
    '.er-read-body',
    '.er-modes',
    '.er-mode-chips',
    '.er-scope',
    '.er-modes-aids',
    '.er-translate-toggle',
    '.er-wordlist-button',
    '.er-page',
  ];
  const elements = {};
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    elements[selector] = element === null
      ? null
      : {
        rect: rectOf(element.getBoundingClientRect()),
        style: styleOf(element),
        visible: isVisible(element),
        text: labelOf(element).slice(0, 240),
      };
  }

  const foot = document.querySelector('.er-read-foot');
  const dock = document.querySelector('.er-mode-dock');
  const paper = document.querySelector('.er-reading-page');
  const readBody = document.querySelector('.er-read-body');
  const paperRect = paper === null ? null : paper.getBoundingClientRect();
  const bodyRect = readBody === null ? null : readBody.getBoundingClientRect();

  /** The bars the bug is about, in the order they stack from the bottom. */
  const bars = [
    { name: 'read-foot', element: foot },
    { name: 'mode-dock', element: dock },
  ];

  const visibleBars = bars
    .filter((bar) => isVisible(bar.element))
    .map((bar) => bar.name);

  // The paragraph text boxes, clipped to the scroll container they live in:
  // this is the cross-check for "is text actually under a control".
  const paragraphBoxes = Array.from(document.querySelectorAll('.er-read-body .er-paragraph-body'))
    .map((element) => clipRect(element.getBoundingClientRect(), bodyRect))
    .filter((box) => box.width > 0 && box.height > 0);

  const barDetails = [];
  let paperArea = 0;
  let bodyArea = 0;
  let textArea = 0;
  for (const bar of bars) {
    const element = bar.element;
    if (element === null) {
      barDetails.push({ name: bar.name, present: false, visible: false });
      continue;
    }
    const rect = element.getBoundingClientRect();
    const visible = isVisible(element);
    const paperOverlap = paperRect === null ? { width: 0, height: 0, area: 0 } : intersection(rect, paperRect);
    const bodyOverlap = bodyRect === null ? { width: 0, height: 0, area: 0 } : intersection(rect, bodyRect);
    let textOverlapArea = 0;
    let coveredParagraphs = 0;
    if (visible) {
      for (const box of paragraphBoxes) {
        const hit = intersection(box, rect);
        if (hit.area > 0) {
          textOverlapArea += hit.area;
          coveredParagraphs += 1;
        }
      }
    }
    if (visible) {
      paperArea += paperOverlap.area;
      bodyArea += bodyOverlap.area;
      textArea = Math.max(textArea, textOverlapArea);
    }
    barDetails.push({
      name: bar.name,
      present: true,
      visible,
      rect: rectOf(rect),
      paperOverlap,
      readBodyOverlap: bodyOverlap,
      textOverlap: { area: round(textOverlapArea), paragraphs: coveredParagraphs },
      text: labelOf(element).slice(0, 240),
    });
  }

  // Two control surfaces at once is the bug itself: if more than one bar is
  // visible and their rects intersect, one is covering the other.
  const barOverlaps = [];
  const visibleBarDetails = barDetails.filter((bar) => bar.visible === true && bar.rect !== undefined);
  for (let i = 0; i < visibleBarDetails.length; i += 1) {
    for (let j = i + 1; j < visibleBarDetails.length; j += 1) {
      const hit = intersection(visibleBarDetails[i].rect, visibleBarDetails[j].rect);
      barOverlaps.push({
        a: visibleBarDetails[i].name,
        b: visibleBarDetails[j].name,
        overlap: hit,
        area: hit.area,
      });
    }
  }

  const paperSurface = paperRect === null ? 0 : round(paperRect.width * paperRect.height);

  return {
    stageMeta: window.__STAGE_META__ ?? null,
    readerClass: document.querySelector('.er-reader')?.className ?? null,
    // The practice panel must never push the page sideways, whatever the width.
    modesLayout: (() => {
      const row = document.querySelector('.er-modes');
      const aids = document.querySelector('.er-modes-aids');
      if (row === null) return null;
      const rowRect = row.getBoundingClientRect();
      const aidsRect = aids === null ? null : aids.getBoundingClientRect();
      return {
        rowWidth: Math.round(rowRect.width),
        rowScrollWidth: row.scrollWidth,
        rowRight: Math.round(rowRect.right),
        aidsRight: aidsRect === null ? null : Math.round(aidsRect.right),
        aidsInside: aidsRect === null ? null : aidsRect.right <= rowRect.right + 1,
        docScrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      };
    })(),
    mode: requestedMode,
    pressedMode: labelOf(document.querySelector('.er-mode[aria-pressed="true"]')),
    phone,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    },
    document: {
      title: document.title,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      bodyOverflow: window.getComputedStyle(document.body).overflow,
    },
    elements,
    visibleBars,
    barDetails,
    // "The text is covered by a control" is readBodyCovered: the scroll
    // container (`.er-read-body`, whose overflow clips the paper) intersected
    // with a visible bar. paperCovered only measures the geometric box of
    // `.er-reading-page`; that box is taller than the visible paper and is
    // clipped by the scroll container, so it stays true even when one bar
    // floats over the card's bottom padding. It is reference, not a verdict.
    // textCovered is the stricter cross-check: paragraph text boxes, clipped
    // to the scroll container, intersected with the visible bars.
    // "Two bottom bars at once": more than one visible bar whose rects
    // intersect (this is what the mode-switch bug looked like).
    barsOverlap: barOverlaps.some((entry) => entry.area > 0),
    barOverlaps,
    readBodyCovered: bodyArea > 0,
    readBodyCoveredArea: round(bodyArea),
    textCovered: textArea > 0,
    textCoveredArea: round(textArea),
    paperCovered: paperArea > 0,
    paperCoveredArea: round(paperArea),
    paperCoveredRatio: paperSurface === 0 ? 0 : round(paperArea / paperSurface),
    coverageCriterion: 'readBodyCovered',
    coverageNote: '正文是否被控件压住以 readBodyCovered 为准；paperCovered 只统计 .er-reading-page 的几何矩形（被滚动容器 overflow 裁切），修好之后仍可能为 true，仅作参考；textCovered 用段落文本块裁切后的交叠面积做更严格的交叉验证。',
    // The paper is the frame; the text window inside it is what scrolls.
    paragraphs: document.querySelectorAll('.er-page-paragraph').length,
    readingScroll: (() => {
      const scroll = document.querySelector('.er-reading-scroll');
      if (scroll === null) return null;
      return {
        className: scroll.className,
        clientHeight: scroll.clientHeight,
        scrollHeight: scroll.scrollHeight,
        scrollTop: Math.round(scroll.scrollTop),
        overflows: scroll.scrollHeight > scroll.clientHeight + 1,
        overflowsByText: (() => {
          const paragraphs = Array.from(scroll.querySelectorAll('.er-page-paragraph'));
          const last = paragraphs[paragraphs.length - 1];
          if (!last) return false;
          return last.getBoundingClientRect().bottom > scroll.getBoundingClientRect().bottom + 1;
        })(),
        documentScrolls: document.documentElement.scrollHeight > window.innerHeight + 1,
      };
    })(),
    footButtons: foot === null
      ? []
      : Array.from(foot.querySelectorAll('button'))
        .filter((button) => isVisible(button))
        .map((button) => labelOf(button))
        .filter((text) => text !== ''),
    // Every chip of the practice panel with its selected state and its
    // computed paint, so the selected style can be checked from the probe.
    modesPanel: Array.from(document.querySelectorAll('.er-mode, .er-scope-item')).map((el) => {
      const style = window.getComputedStyle(el);
      return {
        label: labelOf(el).slice(0, 40),
        pressed: el.getAttribute('aria-pressed'),
        background: style.backgroundColor,
        color: style.color,
        height: Math.round(el.getBoundingClientRect().height),
      };
    }),
    dockText: dock === null ? '' : labelOf(dock).slice(0, 300),
    modeDockVisible: isVisible(dock),
    consoleErrors,
  };
}

/**
 * Write the probe where `run.mjs` can find it. It is hidden so the screenshot
 * shows the reader, not the JSON.
 * @param {object} probe
 */
function writeProbe(probe) {
  let pre = document.getElementById('probe');
  if (pre === null) {
    pre = document.createElement('pre');
    pre.id = 'probe';
    pre.style.display = 'none';
    document.body.appendChild(pre);
  }
  pre.textContent = JSON.stringify(probe, null, 2);
}

/* --------------------------------------------------------------- lifecycle */

const root = createRoot(document.getElementById('root'));
const pageClassName = phone ? 'er-page stage-page is-phone' : 'er-page stage-page';

root.render(React.createElement(
  'div',
  { className: pageClassName },
  React.createElement(ReaderView, {
    t,
    book,
    units,
    index: 0,
    onIndexChange: () => {},
  }),
));

/**
 * Wait for React to commit the click and the reader's measuring effects to
 * settle, then write the probe. Two frames cover the layout loop; the timer
 * covers the effects that wait for a frame after that.
 * @returns {Promise<void>}
 */
async function settle() {
  if (document.fonts && typeof document.fonts.ready === 'object') {
    try {
      await document.fonts.ready;
    } catch (error) {
      consoleErrors.push('fonts.ready: ' + (error && error.message ? error.message : String(error)));
    }
  }
  // Two timer turns let the reader's own measuring effects (which the stage's
  // rAF shim turns into 16ms timers) settle before the probe reads geometry.
  await new Promise((resolve) => setTimeout(resolve, 250));
  await new Promise((resolve) => setTimeout(resolve, 250));
}

/**
 * Mount, switch mode, wait, probe.
 * @returns {Promise<void>}
 */
async function main() {
  await settle();
  pressMode(requestedMode);
  await settle();
  // The mode strip is a floating layer that only shows on hover or when its
  // toggle is pressed: the stage can pin it open for a screenshot.
  if (params.get('modes') === '1') {
    const toggle = document.querySelector('.er-modes-toggle');
    if (toggle === null) consoleErrors.push('modes toggle not found');
    else toggle.click();
    await settle();
    // Headless Chrome does not advance CSS transitions under a virtual time
    // budget, so the strip would stay at opacity 0 in the screenshot. Pin it
    // open for the capture; the class the toggle set is what real users get.
    const strip = document.querySelector('.er-modes');
    if (strip !== null) {
      strip.style.transition = 'none';
      strip.style.opacity = '1';
      strip.style.visibility = 'visible';
    }
  }
  writeProbe(buildProbe());
}

main().catch((error) => {
  consoleErrors.push('stage: ' + (error && error.message ? error.message : String(error)));
  writeProbe({
    mode: requestedMode,
    phone,
    error: consoleErrors[consoleErrors.length - 1],
    consoleErrors,
  });
});

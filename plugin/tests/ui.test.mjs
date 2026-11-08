/**
 * Smoke test for the English reader: loads the built browser module the way
 * the shell does, applies it to a mock client context, and drives the page in
 * jsdom — the panel icon registers, the library shows its empty state, and the
 * typing mode reports accuracy as the learner types.
 *
 * Run: node --test tests/ui.test.mjs
 */
import './dom-setup.mjs'
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { dom } from './dom-setup.mjs'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { act } from 'react'

/**
 * The bundle id must equal the package name: the shell's module loader keys
 * the registered factory by that id. The build reads the name from
 * `package.json`, so the test reads it from there too — the package is named
 * differently in a local checkout and in the published package.
 */
const PACKAGE_ID = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
).name

/** The built bundle is imported once; the factory is called per test. */
let registration

/** Load the built client bundle through the shell's module-loader facade. */
async function loadClientModule() {
  if (registration === undefined) {
    dom.window.__ModuleLoader__ = { load: (value) => { registration = value } }
    await import('../client.js')
    assert.ok(registration, 'the bundle must register a module factory')
    assert.equal(registration.id, PACKAGE_ID)
  }
  return registration.factory((specifier) => {
    if (specifier === 'react') return React
    if (specifier === 'react-dom') return ReactDOM
    throw new Error(`unexpected module request: ${specifier}`)
  })
}

/** A mock client context: slot registry, locale seat, effects. */
function createContext() {
  const registrations = []
  const dictionaries = []
  const ctx = {
    locale: {
      register: (ns, dicts) => { dictionaries.push({ ns, dicts }) },
      bind: (ns) => (key) => `${ns}:${key}`,
    },
    slots: {
      inject: (key, callback) => { callback() },
      register: (options, component) => { registrations.push({ options, component }) },
    },
    effect: (callback) => { callback() },
    on: () => () => {},
    get: () => undefined,
  }
  return { ctx, registrations, dictionaries }
}

/** The translator used by the tests: the key itself is enough to assert on. */
const t = (key) => {
  if (key === 'reader.position') return 'Paragraph {p}/{pt} · Sentence {s}/{st}'
  if (key === 'reader.positionShort') return '{p}/{pt} · {s}/{st}'
  return key
}

/** Type a value into a controlled field the way a learner would. */
async function typeInto(field, value) {
  await act(async () => {
    const prototype = field.tagName === 'TEXTAREA'
      ? dom.window.HTMLTextAreaElement.prototype
      : dom.window.HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set
    setter.call(field, value)
    field.dispatchEvent(new dom.window.InputEvent('input', { bubbles: true }))
  })
}

/**
 * Type one word into the word input and commit it with a space, the way the
 * "Type to Learn" flow works.
 * @param {Element} field - the word input
 * @param {string} word - the word to type
 */
async function typeWord(field, word) {
  await typeInto(field, `${word} `)
}

/**
 * Switch the reader into the typing mode.
 * @param {Element} container - the rendered reader
 */
async function switchToType(container) {
  await switchToMode(container, 'reader.modeType')
}

/**
 * Open the modes panel and hand back its root, which lives in the document
 * because the panel is a floating layer.
 * @param {Element} container - the rendered reader
 * @returns {Promise<Element>} the open panel
 */
async function openModesPanel(container) {
  // Idempotent: a panel that is already open must not be closed by the call.
  const open = dom.window.document.querySelector('.er-modes-panel')
  if (open !== null) return open
  const toggle = container.querySelector('.er-aids-button')
  assert.ok(toggle, 'the aids button exists in the bar')
  await act(async () => { toggle.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  const panel = dom.window.document.querySelector('.er-modes-panel')
  assert.ok(panel, 'the aids panel opens')
  return panel
}

/**
 * Switch the reader into a practice mode by its localized label.
 * @param {Element} container - the rendered reader
 * @param {string} label - the localized mode label ('reader.modeType', …)
 */
async function openMore(container) {
  // Idempotent: clicking the button of an open menu would close it.
  const open = dom.window.document.querySelector('.er-more-pop')
  if (open !== null) return open
  const button = container.querySelector('.er-more-button')
  assert.ok(button, 'the bar carries the tools menu')
  await act(async () => { button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  const menu = dom.window.document.querySelector('.er-more-pop')
  assert.ok(menu, 'the tools menu opens')
  return menu
}
async function switchToMode(container, label) {
  // The practice mode is one click in the top bar: no panel in between.
  const modeButton = [...container.querySelectorAll('.er-mode-button')]
    .find((button) => button.getAttribute('title') === label)
  assert.ok(modeButton, `the ${label} mode button must exist`)
  await act(async () => { modeButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
}

/**
 * Switch the reader into the typing mode with the whole paragraph as target.
 * @param {Element} container - the rendered reader
 */
async function switchToParagraphScope(container) {
  const panel = await openModesPanel(container)
  const scopeButton = [...panel.querySelectorAll('.er-segment.is-quiet .er-segment-item')].find((button) => button.textContent === 'reader.scopeParagraph')
  assert.ok(scopeButton, 'the paragraph scope button must exist')
  await act(async () => { scopeButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
}

test('the bundle registers a sidebar panel entry and a main panel page', async () => {
  const module = await loadClientModule()
  const { ctx, registrations, dictionaries } = createContext()
  module.apply(ctx)

  assert.equal(dictionaries.length, 1)
  assert.equal(dictionaries[0].ns, 'reader')
  assert.ok(dictionaries[0].dicts.en['reader.modeType'])
  assert.ok(dictionaries[0].dicts.zh['reader.modeType'])

  const panel = registrations.find((entry) => entry.options?.name === 'sidebar.panellist')
  const page = registrations.find((entry) => entry.options?.name === 'main')
  assert.ok(panel, 'the sidebar panel entry must be registered')
  assert.ok(page, 'the main panel page must be registered')
  assert.equal(panel.options.id, 'reader')
  assert.equal(page.options.key, 'reader')
})

test('the page renders the library empty state', async () => {
  const module = await loadClientModule()
  const { ctx, registrations } = createContext()
  module.apply(ctx)
  const page = registrations.find((entry) => entry.options?.name === 'main')

  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)
  await act(async () => { root.render(React.createElement(page.component, { t })) })
  assert.match(container.textContent, /library\.emptyTitle/)
  await act(async () => { root.unmount() })
})

test('the reader shows the sentence and scores the typed text', async () => {
  const { ReaderView } = await import('../src/ui/reader.js')
  const unit = {
    id: 'u1',
    chapterIndex: 0,
    chapterTitle: 'Chapter One',
    paragraphIndex: 0,
    sentenceIndex: 0,
    text: 'The quick brown fox jumps over the lazy dog.',
    words: [
      { text: 'The', clean: 'the', start: 0, end: 3 },
      { text: 'quick', clean: 'quick', start: 4, end: 9 },
      { text: 'brown', clean: 'brown', start: 10, end: 15 },
      { text: 'fox', clean: 'fox', start: 16, end: 19 },
      { text: 'jumps', clean: 'jumps', start: 20, end: 25 },
      { text: 'over', clean: 'over', start: 26, end: 30 },
      { text: 'the', clean: 'the', start: 31, end: 34 },
      { text: 'lazy', clean: 'lazy', start: 35, end: 39 },
      { text: 'dog.', clean: 'dog', start: 40, end: 44 },
    ],
  }

  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)
  await act(async () => {
    root.render(React.createElement(ReaderView, {
      t,
      book: { title: 'Test Book' },
      units: [unit],
      index: 0,
      onIndexChange: () => {},
    }))
  })

  assert.match(container.textContent, /The/)
  assert.match(container.textContent, /dog\./)

  // Switch to the typing mode and type the sentence word by word.
  await switchToType(container)

  const field = container.querySelector('input.er-word-input')
  assert.ok(field, 'the typing panel must render the word input')

  for (const word of ['The', 'quick', 'brown', 'fox', 'jumps', 'over', 'the', 'lazy', 'dog']) {
    await typeWord(field, word)
  }

  assert.match(container.querySelector('.er-type-bar-status').textContent, /100%/)
  assert.equal(container.querySelectorAll('.er-char.is-bad-char').length, 0)
  await act(async () => { root.unmount() })
})

test('a missed word is missed, not wrong, in the passage', async () => {
  const { alignSpokenWords } = await import('../src/ui/reader.js')
  const practice = [
    { text: 'The', displayIndex: 0 },
    { text: 'quick', displayIndex: 1 },
    { text: 'brown', displayIndex: 2 },
    { text: 'fox.', displayIndex: 3 },
  ]
  const result = [
    { word: 'The', status: 'ok' },
    { word: 'quick', status: 'wrong', heard: 'quack' },
    { word: 'brown', status: 'missing' },
    { word: 'fox', status: 'ok' },
  ]
  const states = alignSpokenWords(result, practice)
  // 'ok', 'bad', null (missed), 'ok' — the null is what paints the dotted mark.
  assert.deepEqual(states, ['ok', 'bad', null, 'ok'])
})

test('the paper is a fixed frame and the text scrolls inside it', async () => {
  const { ReaderView } = await import('../src/ui/reader.js')
  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)
  await act(async () => {
    root.render(React.createElement(ReaderView, {
      t,
      book: { title: 'Test Book' },
      units: paragraphUnits(),
      index: 0,
      onIndexChange: () => {},
    }))
  })

  // The sheet is the frame; the window inside it is what scrolls. The
  // paragraphs must live in the window, never as siblings of it.
  const page = container.querySelector('.er-reading-page')
  assert.ok(page, 'the paper must exist')
  const window_ = page.querySelector(':scope > .er-reading-scroll')
  assert.ok(window_, 'the text window must sit inside the paper')
  assert.ok(window_.querySelector('.er-page-paragraph'), 'the paragraphs live in the text window')
  assert.equal(page.querySelector(':scope > .er-page-paragraph'), null, 'no paragraph may sit outside the window')

  await act(async () => { root.unmount() })
})

test('the practice panel is three zones with one selected style', async () => {
  const { ReaderView } = await import('../src/ui/reader.js')
  const units = paragraphUnits()
  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)
  await act(async () => {
    root.render(React.createElement(ReaderView, {
      t,
      book: { title: 'Test Book' },
      units,
      index: 0,
      onIndexChange: () => {},
    }))
  })

  // Three mode buttons in the bar; the aids button opens the unit + aids panel.
  assert.equal(container.querySelectorAll('.er-mode-button').length, 3, 'one button per practice mode')
  const toggle = container.querySelector('.er-aids-button')
  assert.ok(toggle, 'the aids button exists in the bar')
  await act(async () => { toggle.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  const panel = dom.window.document.querySelector('.er-modes-panel')
  assert.ok(panel, 'the practice panel must exist')
  const groups = panel.querySelectorAll('.er-modes-group')
  const scope = panel.querySelector('.er-segment.is-quiet')
  const aids = panel.querySelector('.er-aid-chip')
  assert.ok(groups.length === 2 && scope && aids, 'the panel carries the practice unit and the aids')
  assert.equal(scope.querySelectorAll('.er-segment-item').length, 3)

  // The translation is a reading aid, not a fourth practice unit: it is one of
  // the aid toggles, and the unit row knows nothing about it.
  const aidsGrid = panel.querySelector('.er-aid-grid')
  const translateChip = [...aidsGrid.querySelectorAll('.er-aid-chip')]
    .find((chip) => chip.textContent.includes('reader.aidTranslate'))
  assert.ok(translateChip, 'the translation switch lives with the reading aids')
  assert.equal(scope.contains(translateChip), false)

  // Exactly one unit is selected; a toggle is neither.
  assert.equal(panel.querySelectorAll('.er-segment-item[aria-pressed="true"]').length, 1, 'the current unit is marked')

  // Each choice group carries its own accessible name, and the reading aids are
  // toggles rather than choices: a screen reader hears a different thing.
  assert.equal(groups[0].getAttribute('role'), 'group')
  assert.equal(groups[1].getAttribute('role'), 'group')
  assert.notEqual(groups[0].getAttribute('aria-label'), groups[1].getAttribute('aria-label'))
  assert.equal(panel.querySelectorAll('.er-aid-chip').length, 6, 'the reading aids are six toggles')

  // Choosing a unit keeps the panel open: the learner usually sets the unit and
  // an aid in the same visit, and a panel that vanishes mid-setting is a chore.
  const paragraphChip = [...scope.querySelectorAll('.er-segment-item')].find((chip) => chip.textContent === 'reader.scopeParagraph')
  await act(async () => { paragraphChip.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  assert.ok(dom.window.document.querySelector('.er-modes-panel'), 'the panel stays open while setting it up')
  assert.equal(paragraphChip.getAttribute('aria-pressed'), 'true')

  // A mode is one click in the bar, no panel involved.
  await act(async () => {
    const typeButton = [...container.querySelectorAll('.er-mode-button')].find((button) => button.getAttribute('title') === 'reader.modeType')
    typeButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
  })
  assert.match(container.querySelector('.er-reader').className, /is-mode-type/)
  assert.ok(dom.window.document.querySelector('.er-modes-panel'), 'the panel is not closed by a mode switch')

  await act(async () => { root.unmount() })
})

test('the bottom bar switches with the mode instead of stacking', async () => {
  const { ReaderView } = await import('../src/ui/reader.js')
  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)
  await act(async () => {
    root.render(React.createElement(ReaderView, {
      t,
      book: { title: 'Test Book' },
      units: paragraphUnits(),
      index: 0,
      onIndexChange: () => {},
    }))
  })

  // Reading mode: the player is the only bottom bar, no practice panel.
  assert.ok(container.querySelector('.er-read-foot'), 'the player belongs to the reading mode')
  assert.equal(container.querySelector('.er-type-panel'), null)
  assert.equal(container.querySelector('.er-speak-panel'), null)

  // Typing mode: the typing bar takes the bottom and the player leaves, so
  // the learner never reads two bars that fight for the same edge.
  await switchToMode(container, 'reader.modeType')
  assert.equal(container.querySelector('.er-read-foot'), null, 'the player must not stay under the typing bar')
  assert.ok(container.querySelector('.er-mode-dock.is-typing .er-type-panel'), 'the typing bar is docked')
  assert.match(container.querySelector('.er-reader').className, /is-mode-type/)

  // Read-aloud mode: same rule, the read-aloud bar is the only one.
  await switchToMode(container, 'reader.modeSpeak')
  assert.equal(container.querySelector('.er-read-foot'), null)
  assert.ok(container.querySelector('.er-mode-dock.is-read-aloud .er-speak-panel'), 'the read-aloud bar is docked')
  assert.equal(container.querySelector('.er-type-panel'), null)

  // Back to reading: the player returns and the practice bars leave.
  await switchToMode(container, 'reader.modeListen')
  assert.ok(container.querySelector('.er-read-foot'))
  assert.equal(container.querySelector('.er-type-panel'), null)
  assert.equal(container.querySelector('.er-speak-panel'), null)

  await act(async () => { root.unmount() })
})

/**
 * Three sentences that belong to one paragraph, plus a second paragraph.
 * @returns {object[]} the sentence units
 */
function paragraphUnits() {
  const make = (id, paragraphIndex, sentenceIndex, text, words) => ({
    id,
    chapterIndex: 0,
    chapterTitle: 'Chapter One',
    paragraphIndex,
    sentenceIndex,
    text,
    words,
  })
  const first = make('u1', 0, 0, 'The first sentence ends here.', [
    { text: 'The', clean: 'the', start: 0, end: 3 },
    { text: 'first', clean: 'first', start: 4, end: 9 },
    { text: 'sentence', clean: 'sentence', start: 10, end: 18 },
    { text: 'ends', clean: 'ends', start: 19, end: 23 },
    { text: 'here.', clean: 'here', start: 24, end: 29 },
  ])
  const second = make('u2', 0, 1, 'The second one follows.', [
    { text: 'The', clean: 'the', start: 0, end: 3 },
    { text: 'second', clean: 'second', start: 4, end: 10 },
    { text: 'one', clean: 'one', start: 11, end: 14 },
    { text: 'follows.', clean: 'follows', start: 15, end: 23 },
  ])
  const third = make('u3', 0, 2, 'A third one closes the paragraph.', [
    { text: 'A', clean: 'a', start: 0, end: 1 },
    { text: 'third', clean: 'third', start: 2, end: 7 },
    { text: 'one', clean: 'one', start: 8, end: 11 },
    { text: 'closes', clean: 'closes', start: 12, end: 18 },
    { text: 'the', clean: 'the', start: 19, end: 22 },
    { text: 'paragraph.', clean: 'paragraph', start: 23, end: 33 },
  ])
  const next = make('u4', 1, 0, 'The next paragraph starts.', [
    { text: 'The', clean: 'the', start: 0, end: 3 },
    { text: 'next', clean: 'next', start: 4, end: 8 },
    { text: 'paragraph', clean: 'paragraph', start: 9, end: 18 },
    { text: 'starts.', clean: 'starts', start: 19, end: 26 },
  ])
  return [first, second, third, next]
}

test('the reader shows the whole paragraph and marks the active sentence', async () => {
  const { ReaderView } = await import('../src/ui/reader.js')
  const units = paragraphUnits()
  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)
  await act(async () => {
    root.render(React.createElement(ReaderView, {
      t,
      book: { title: 'Test Book' },
      units,
      index: 0,
      onIndexChange: () => {},
    }))
  })

  const paragraph = container.querySelector('.er-paragraph')
  assert.ok(paragraph, 'the paragraph view must exist')
  // All three sentences of the paragraph are on screen at once.
  assert.match(paragraph.textContent, /The first sentence ends here\./)
  assert.match(paragraph.textContent, /The second one follows\./)
  assert.match(paragraph.textContent, /A third one closes the paragraph\./)
  // The reading surface shows a page: the active paragraph plus the next one.
  assert.equal(container.querySelectorAll('.er-paragraph .er-word').length, 19)
  assert.equal(container.querySelectorAll('.er-page-paragraph').length, 2)
  assert.equal(container.querySelectorAll('.er-page-paragraph.is-active').length, 1)

  // The counter names the paragraph and the sentence inside it. The bar shows
  // the short form and keeps the long one for the tooltip.
  const counter = container.querySelector('.er-read-counter')
  assert.ok(counter !== null, 'the bar carries the position')
  assert.match(counter.textContent, /1\/2 · 1\/3/)
  assert.match(counter.getAttribute('title'), /Paragraph 1\/2 · Sentence 1\/3/)

  // The sentences outside the active one are context, not target.
  assert.equal(container.querySelectorAll('.er-word.is-muted').length, 10)

  // Switching the practice unit to the paragraph takes every word as target.
  const scopePanel = await openModesPanel(container)
  const scopeParagraph = [...scopePanel.querySelectorAll('.er-segment.is-quiet .er-segment-item')].find((button) => button.textContent === 'reader.scopeParagraph')
  assert.ok(scopeParagraph, 'the scope switch must exist')
  await act(async () => { scopeParagraph.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  assert.equal(container.querySelectorAll('.er-word.is-muted').length, 0)

  await act(async () => { root.unmount() })
})

test('the reader opens without a book instead of crashing', async () => {
  const { ReaderView } = await import('../src/ui/reader.js')
  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)
  // The reader tab can be opened before a book is loaded: there is no active
  // unit at all. The view must show its empty state instead of throwing.
  await act(async () => {
    root.render(React.createElement(ReaderView, {
      t,
      book: null,
      units: [],
      index: 0,
      onIndexChange: () => {},
    }))
  })

  assert.ok(container.querySelector('.er-empty'), 'the empty state must be shown')
  assert.equal(container.querySelectorAll('.er-paragraph-row').length, 0)

  await act(async () => { root.unmount() })
})

test('typing the active sentence scores only that sentence', async () => {
  const { ReaderView } = await import('../src/ui/reader.js')
  const units = paragraphUnits()
  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)
  await act(async () => {
    root.render(React.createElement(ReaderView, {
      t,
      book: { title: 'Test Book' },
      units,
      index: 0,
      onIndexChange: () => {},
    }))
  })

  await switchToType(container)
  const field = container.querySelector('input.er-word-input')
  for (const word of ['The', 'first', 'sentence', 'ends', 'here']) {
    await typeWord(field, word)
  }

  assert.match(container.querySelector('.er-type-bar-status').textContent, /100%/)
  assert.equal(container.querySelectorAll('.er-char.is-bad-char').length, 0)
  // The sentences outside the practice unit stay untouched context.
  assert.equal(container.querySelectorAll('.er-word.is-muted').length, 10)

  await act(async () => { root.unmount() })
})

test('a mistyped word stays in place and is marked red', async () => {
  const { ReaderView } = await import('../src/ui/reader.js')
  const units = paragraphUnits()
  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)
  await act(async () => {
    root.render(React.createElement(ReaderView, {
      t,
      book: { title: 'Test Book' },
      units,
      index: 0,
      onIndexChange: () => {},
    }))
  })

  await switchToType(container)
  const field = container.querySelector('input.er-word-input')
  await typeWord(field, 'The')
  // "frist" is not "first": without forgiving, the learner stays on the word.
  await typeWord(field, 'frist')

  assert.ok(container.querySelectorAll('.er-char.is-bad-char').length > 0, 'the wrong characters must be marked')
  assert.equal(container.querySelectorAll('.er-word.is-current').length, 1, 'the word stays the current one')
  assert.ok(!/100%/.test(container.querySelector('.er-type-bar-status').textContent), 'the accuracy must drop')

  await act(async () => { root.unmount() })
})

test('typing the whole paragraph scores every word of it', async () => {
  const { ReaderView } = await import('../src/ui/reader.js')
  const units = paragraphUnits()
  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)
  await act(async () => {
    root.render(React.createElement(ReaderView, {
      t,
      book: { title: 'Test Book' },
      units,
      index: 0,
      onIndexChange: () => {},
    }))
  })

  await switchToType(container)
  await switchToParagraphScope(container)

  const field = container.querySelector('input.er-word-input')
  const words = ['The', 'first', 'sentence', 'ends', 'here', 'The', 'second', 'one', 'follows', 'A', 'third', 'one', 'closes', 'the', 'paragraph']
  for (const word of words) {
    await typeWord(field, word)
  }

  assert.match(container.querySelector('.er-type-bar-status').textContent, /100%/)
  assert.equal(container.querySelectorAll('.er-char.is-bad-char').length, 0)
  assert.equal(container.querySelectorAll('.er-word.is-muted').length, 0)

  await act(async () => { root.unmount() })
})

test('the library switches between covers and rows, and searches', async () => {
  const { LibraryView } = await import('../src/ui/library.js')
  const books = [
    { id: 'b1', title: 'Pride and Prejudice', author: 'Jane Austen', format: 'epub', chapters: [{ title: 'One', paragraphs: ['a'] }], cover: 'data:image/jpeg;base64,AAA', progress: { percent: 0.42, activity: { totalWords: 1200, totalMs: 600000 } } },
    { id: 'b2', title: 'MOVE', author: 'Sangram Vajre', format: 'epub', chapters: [{ title: 'One', paragraphs: ['a', 'b'] }], cover: null, progress: { percent: 0 } },
  ]
  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)
  let view = 'grid'
  let rerender = () => {}
  const render = () => React.createElement(LibraryView, {
    t: (key) => key,
    books,
    busy: false,
    error: '',
    view,
    onViewChange: (next) => { view = next; rerender(); },
    onFiles: () => {},
    onOpen: () => {},
    onDelete: () => {},
    onRename: () => {},
    onListen: () => {},
  })
  rerender = () => { root.render(render()); }
  await act(async () => { root.render(render()) })

  // Covers are the default view.
  assert.equal(container.querySelectorAll('.er-shelf-card').length, 2)
  assert.equal(container.querySelectorAll('.er-shelf-cover').length, 2)
  assert.equal(container.querySelectorAll('.er-cover-image').length, 1)

  // The reading figures are on top.
  assert.match(container.querySelector('.er-library-cards').textContent, /library.statRead/)
  assert.match(container.querySelector('.er-library-cards').textContent, /library.statSpeed/)

  // Switch to the row view.
  const toggle = container.querySelector('.er-view-switch-item')
  await act(async () => { toggle.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  assert.equal(container.querySelectorAll('.er-book').length, 2)
  assert.equal(container.querySelectorAll('.er-shelf-card').length, 0)

  // Search narrows the list.
  const search = container.querySelector('.er-library-search input')
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set
    setter.call(search, 'MOVE')
    search.dispatchEvent(new dom.window.InputEvent('input', { bubbles: true }))
  })
  assert.equal(container.querySelectorAll('.er-book').length, 1)

  await act(async () => { root.unmount() })
})

test('the learning modes panel switches the reading aids', async () => {
  const { ReaderView } = await import('../src/ui/reader.js')
  const units = paragraphUnits()
  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)
  await act(async () => {
    root.render(React.createElement(ReaderView, {
      t: (key) => key,
      book: { id: 'b1', title: 'Test Book' },
      units,
      index: 0,
      onIndexChange: () => {},
    }))
  })

  // The reading aids, the table of contents and the settings live in the top
  // bar: the right-edge rail that used to carry them is gone on the desktop.
  assert.equal(container.querySelectorAll('.er-read-tools').length, 0, 'no rail at the right edge')
  // The three practice modes are one click each in the bar; the aids button
  // opens the panel that carries the unit and the aids.
  assert.equal(container.querySelectorAll('.er-mode-button').length, 3, 'one button per practice mode')
  const modesButton = container.querySelector('.er-aids-button')
  const toc = container.querySelector('.er-toc-button')
  assert.ok(modesButton && toc, 'the bar carries the aids button and the table of contents')

  // The panel lists the six reading aids. It floats in the body: it is
  // anchored to the reader, but nothing inside the reader may clip it.
  await act(async () => { modesButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  // Two groups: the practice decision, then the aid grid.
  assert.equal(dom.window.document.querySelectorAll('.er-modes-panel .er-modes-group').length, 2)
  assert.equal(dom.window.document.querySelectorAll('.er-modes-panel .er-aid-chip').length, 6)
  assert.equal(container.querySelectorAll('.er-mode-row').length, 0, 'the panel must not live inside the reader')

  // Blur text hides the sentences until they are tapped.
  const aidChips = [...dom.window.document.querySelectorAll('.er-modes-panel .er-aid-chip')]
  const aidNamed = (key) => aidChips.find((chip) => chip.textContent.includes(key))
  await act(async () => { aidNamed('reader.aidBlur').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  const blurredBefore = container.querySelectorAll('.er-sentence.is-blurred').length
  assert.ok(blurredBefore > 0)
  await act(async () => { container.querySelector('.er-sentence.is-blurred').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  assert.equal(container.querySelectorAll('.er-sentence.is-blurred').length, blurredBefore - 1)

  // Bionic reading bolds the beginning of every word.
  await act(async () => { aidNamed('reader.aidBionic').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  assert.ok(container.querySelectorAll('.er-paragraph b').length > 0)

  // The table of contents lists the chapters.
  await act(async () => { toc.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  assert.equal(container.querySelectorAll('.er-toc-row').length, units.length === 4 ? 2 : 1)

  await act(async () => { root.unmount() })
})

test('听读模式用左右方向键翻页', async () => {
  const { ReaderView } = await import('../src/ui/reader.js')
  const units = paragraphUnits()
  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)
  const indexes = []
  await act(async () => {
    root.render(React.createElement(ReaderView, {
      t: (key) => key,
      book: { id: 'b1', title: 'Test Book' },
      units,
      index: 0,
      onIndexChange: (next) => indexes.push(next),
    }))
  })

  const press = async (key) => {
    await act(async () => {
      dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    });
  };

  await press('ArrowRight');
  assert.deepEqual(indexes, [1]);
  await press('ArrowLeft');
  assert.deepEqual(indexes, [1, 0]);

  // The typing mode keeps the arrow keys for the caret.
  await act(async () => {
    const type = [...container.querySelectorAll('.er-mode-button')].find((b) => b.getAttribute('title') === 'reader.modeType');
    type.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });
  await press('ArrowRight');
  assert.deepEqual(indexes, [1, 0]);

  await act(async () => { root.unmount(); });
})

test('封面上的两个按钮都有反应：朗读会触发，菜单会打开', async () => {
  const { LibraryView } = await import('../src/ui/library.js')
  const books = [
    { id: 'b1', title: 'MOVE', author: 'A', format: 'epub', chapters: [{ title: 'One', paragraphs: ['a'] }], cover: 'data:image/jpeg;base64,AAA', progress: { percent: 0 } },
  ]
  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)
  const listened = []
  const render = (view) => React.createElement(LibraryView, {
    t: (key) => key,
    books,
    busy: false,
    error: '',
    view,
    onViewChange: () => {},
    onFiles: () => {},
    onOpen: () => {},
    onDelete: () => {},
    onRename: () => {},
    onListen: (id) => { listened.push(id); },
  })
  await act(async () => { root.render(render('list')) })

  const cover = container.querySelector('.er-book-cover-small')
  assert.ok(cover, 'the list row shows a small cover')

  // The listen button speaks the book.
  await act(async () => {
    cover.querySelector('.er-cover-listen').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
  })
  assert.deepEqual(listened, ['b1'])

  // The menu button opens the menu, in the list view as well.
  assert.equal(container.querySelectorAll('.er-book-menu').length, 0)
  await act(async () => {
    cover.querySelector('.er-cover-menu').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
  })
  const menu = container.querySelector('.er-book-menu')
  assert.ok(menu, 'the menu opens from the list row')
  assert.equal(menu.querySelectorAll('.er-book-menu-item').length, 7)

  // 没有源文件的书：查看与下载都是关着的，并且说清楚为什么。
  const sourceItems = Array.from(menu.querySelectorAll('.er-book-menu-item'))
    .filter((item) => item.textContent === 'library.sourceView' || item.textContent === 'library.sourceDownload')
  assert.equal(sourceItems.length, 2)
  for (const item of sourceItems) {
    assert.equal(item.disabled, true)
    assert.equal(item.title, 'library.sourceMissing')
  }

  await act(async () => { root.unmount() })
})

test('有源文件的书：查看与下载都能点', async () => {
  const { LibraryView } = await import('../src/ui/library.js')
  const books = [
    {
      id: 'b2', title: 'MOVE', author: 'A', format: 'epub', chapters: [{ title: 'One', paragraphs: ['a'] }],
      cover: 'data:image/jpeg;base64,AAA', progress: { percent: 0 },
      source: { fileName: 'MOVE.epub', format: 'epub', contentType: 'application/epub+zip', size: 1024, storedAt: 1 },
    },
  ]
  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)
  const opened = []
  const downloaded = []
  const render = (view) => React.createElement(LibraryView, {
    t: (key) => key,
    books,
    busy: false,
    error: '',
    view,
    onViewChange: () => {},
    onFiles: () => {},
    onOpen: () => {},
    onDelete: () => {},
    onRename: () => {},
    onListen: () => {},
    onOpenSource: (id) => { opened.push(id); },
    onDownloadSource: async (id) => { downloaded.push(id); return 'MOVE.epub'; },
  })
  await act(async () => { root.render(render('list')) })

  const cover = container.querySelector('.er-book-cover-small')
  await act(async () => {
    cover.querySelector('.er-cover-menu').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
  })
  const menu = container.querySelector('.er-book-menu')
  const view = Array.from(menu.querySelectorAll('.er-book-menu-item'))
    .find((item) => item.textContent === 'library.sourceView')
  const download = Array.from(menu.querySelectorAll('.er-book-menu-item'))
    .find((item) => item.textContent === 'library.sourceDownload')
  assert.ok(view && download, 'the menu carries the two source entries')
  assert.equal(view.disabled, false)
  assert.equal(download.disabled, false)

  await act(async () => {
    view.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
  })
  assert.deepEqual(opened, ['b2'])

  await act(async () => {
    cover.querySelector('.er-cover-menu').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
  })
  const menuAgain = container.querySelector('.er-book-menu')
  const downloadAgain = Array.from(menuAgain.querySelectorAll('.er-book-menu-item'))
    .find((item) => item.textContent === 'library.sourceDownload')
  await act(async () => {
    downloadAgain.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
  })
  assert.deepEqual(downloaded, ['b2'])

  await act(async () => { root.unmount() })
})

test('every paragraph carries a note button, and the note is kept', async () => {
  const { setNotesBackend, createMemoryBackend, listNotes } = await import('../src/lib/notes.js')
  setNotesBackend(createMemoryBackend())
  const { ReaderView } = await import('../src/ui/reader.js')
  const units = paragraphUnits()
  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)
  await act(async () => {
    root.render(React.createElement(ReaderView, {
      t: (key) => key,
      book: { id: 'b1', title: 'Test Book' },
      units,
      index: 0,
      onIndexChange: () => {},
    }))
  })

  // One gutter per paragraph: note, translate, listen, type, read aloud.
  const buttons = container.querySelectorAll('.er-paragraph-action')
  assert.equal(buttons.length, 10, 'every paragraph has five buttons')

  // The editor floats in the body, next to the paragraph it belongs to.
  await act(async () => { buttons[0].dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  const editor = dom.window.document.querySelector('.er-note-editor')
  assert.ok(editor, 'the note editor must open')
  assert.equal(container.querySelector('.er-note-editor'), null, 'the editor must not sit inside the reader')

  // Write the note and save it.
  const field = editor.querySelector('textarea.er-note-input')
    ?? editor.querySelector('textarea.er-note-editor-input')
  await typeInto(field, 'a note about this paragraph')
  await act(async () => { editor.querySelector('.er-btn-primary').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await act(async () => {})

  // The note is stored, and the paragraph keeps its mark.
  const notes = await listNotes('b1')
  assert.equal(notes.length, 1)
  assert.equal(notes[0].text, 'a note about this paragraph')
  assert.equal(notes[0].unitIndex, 0, 'the note belongs to the first sentence of the paragraph')
  assert.equal(container.querySelectorAll('.er-paragraph-action.is-noted').length, 1)

  setNotesBackend(null)
  await act(async () => { root.unmount() })
})

test('翻译语言可以选，翻译请求带着目标语言', async (t) => {
  const { ReaderView } = await import('../src/ui/reader.js')
  const units = paragraphUnits()
  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)
  const requests = []
  const originalFetch = globalThis.fetch
  t.after(() => { globalThis.fetch = originalFetch })
  globalThis.fetch = async (url, options) => {
    const request = JSON.parse(options.body);
    requests.push(request);
    return { status: 200, json: async () => ({ ok: true, result: { text: 'こんにちは' } }) };
  }

  await act(async () => {
    root.render(React.createElement(ReaderView, {
      t: (key) => key,
      book: { id: 'b1', title: 'Test Book' },
      units,
      index: 0,
      onIndexChange: () => {},
    }))
  })

  // The settings carry the language the translation is made in. The full
  // settings sheet opens from the typography button in the top bar.
  const typography = container.querySelector('.er-typography-button')
  assert.ok(typography, 'the typography button must exist')
  await act(async () => { typography.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  const opener = dom.window.document.querySelector('.er-setting-more')
  assert.ok(opener, 'the popover leads to the full settings')
  await act(async () => { opener.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })

  const picker = dom.window.document.querySelector('.er-settings select')
  assert.ok(picker, 'the settings must offer the translation language')
  const offered = [...picker.querySelectorAll('option')].map((option) => option.value)
  assert.ok(offered.includes('ja'), 'Japanese must be offered')
  assert.ok(offered.includes('zh'), 'Chinese must be offered')
  assert.equal(picker.value, 'zh', 'Chinese is the default')

  await act(async () => {
    picker.value = 'ja'
    picker.dispatchEvent(new dom.window.Event('change', { bubbles: true }))
  })

  // The translation asks for that language.
  const row = container.querySelector('.er-paragraph-row')
  const buttons = row.querySelectorAll('.er-paragraph-action')
  await act(async () => { buttons[1].dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await act(async () => {})
  const request = requests.find((entry) => entry.method === 'translate')
  assert.ok(request, 'the paragraph must be translated')
  assert.equal(request.payload.target, 'ja', 'the request names the target language')

  await act(async () => { root.unmount() })
})

test('段落右侧的翻译按钮只翻这一段，朗读按钮只读这一段', async (t) => {
  const { ReaderView } = await import('../src/ui/reader.js')
  const units = paragraphUnits()
  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)
  const requests = []
  const originalFetch = globalThis.fetch
  t.after(() => { globalThis.fetch = originalFetch })
  globalThis.fetch = async (url, options) => {
    const request = JSON.parse(options.body);
    requests.push(request);
    return { status: 200, json: async () => ({ ok: true, result: { text: '这一段的中文翻译' } }) };
  }

  await act(async () => {
    root.render(React.createElement(ReaderView, {
      t: (key) => key,
      book: { id: 'b1', title: 'Test Book' },
      units,
      index: 0,
      onIndexChange: () => {},
    }))
  })

  const rows = container.querySelectorAll('.er-paragraph-row')
  assert.equal(rows.length, 2, 'two paragraphs on the page')
  const buttons = rows[0].querySelectorAll('.er-paragraph-action')
  assert.equal(buttons.length, 5, 'note, translate, listen, type and read aloud')

  // The translate button asks for that paragraph only.
  const translateButton = [...buttons].find((button) => button.getAttribute('title') === 'reader.translateThis')
  await act(async () => { translateButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await act(async () => {})
  const request = requests.find((entry) => entry.method === 'translate')
  assert.ok(request, 'the paragraph must be translated')
  assert.match(request.payload.text, /The first sentence ends here\./)
  const translation = rows[0].querySelector('.er-translation')
  assert.ok(translation, 'the translation shows under the paragraph')
  assert.match(translation.textContent, /这一段的中文翻译/)

  // The play button speaks that paragraph on its own. jsdom has no speech
  // synthesis, so the attempt fails — but it must not break the page.
  await act(async () => { buttons[2].dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await act(async () => {})
  assert.equal(container.querySelectorAll('.er-paragraph-row').length, 2, 'the page survives a failed playback')

  await act(async () => { root.unmount() })
})

test('阅读条上挂着思维导图与音频播客两个入口', async () => {
  const { ReaderView } = await import('../src/ui/reader.js')
  const units = paragraphUnits()
  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)
  await act(async () => {
    root.render(React.createElement(ReaderView, {
      t: (key) => key,
      book: { id: 'b1', title: 'Test Book' },
      units,
      index: 0,
      onIndexChange: () => {},
    }))
  })

  // The bar has three zones: the book, the place, the actions. The mind map
  // and the podcast hang in the action group, next to each other.
  const bar = container.querySelector('.er-read-bar')
  const buttons = [...bar.querySelectorAll('button')]
  const wordListAt = buttons.findIndex((button) => button.classList.contains('er-wordlist-button'))
  const moreAt = buttons.findIndex((button) => button.classList.contains('er-more-button'))
  assert.ok(wordListAt >= 0, 'the vocabulary button must be in the read bar')
  assert.ok(moreAt >= 0, 'the notes, mind map and podcast live in one menu')
  assert.ok(wordListAt > moreAt, 'the vocabulary button closes the action group')
  const menuRows = [...(await openMore(container)).querySelectorAll('.er-more-row')].map((row) => row.textContent.trim())
  assert.deepEqual(menuRows, ['notes.title', 'mindmap.open', 'podcast.open'], 'the menu holds the three occasional tools')
  // The book leads the bar, and the chapter is a chip of its own.
  const title = bar.querySelector('.er-read-title')
  assert.ok(title !== null, 'the bar names the book')
  assert.equal(title.textContent, 'Test Book')
  assert.ok(bar.querySelector('.er-read-chapter') !== null, 'the chapter is a chip')

  // The mind map opens its own panel. The model is not reachable in the test,
  // so the panel shows the failure instead of a drawing.
  const menu = await openMore(container)
  const mindMapButton = [...menu.querySelectorAll('.er-more-row')].find((row) => row.textContent.trim() === 'mindmap.open')
  await act(async () => { mindMapButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await act(async () => {})
  assert.ok(dom.window.document.querySelector('.er-modal'), 'the mind map panel must open')

  await act(async () => { root.unmount() })
})

test('思维导图的节点能跳回书里对应的那一段', async (t) => {
  const { ReaderView } = await import('../src/ui/reader.js')
  const units = paragraphUnits()
  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)
  const jumps = []
  // The host answers with a map whose node quotes the second paragraph, so the
  // node can be located in the book.
  t.after(() => { globalThis.fetch = originalFetch })
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => ({
    status: 200,
    json: async () => ({
      ok: true,
      result: {
        title: '关系',
        branches: [{
          label: '主线',
          quote: 'The next paragraph starts',
          items: [{ label: '相遇', note: '', quote: 'The next paragraph starts.' }],
        }],
      },
    }),
  })

  await act(async () => {
    root.render(React.createElement(ReaderView, {
      t: (key) => key,
      book: { id: 'b1', title: 'Test Book' },
      units,
      index: 0,
      onIndexChange: (next) => jumps.push(next),
    }))
  })

  const bar = container.querySelector('.er-read-bar')
  const menu = await openMore(container)
  const button = [...menu.querySelectorAll('.er-more-row')].find((row) => row.textContent.trim() === 'mindmap.open')
  await act(async () => { button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await act(async () => {})

  // The map is on screen.
  const nodes = dom.window.document.querySelectorAll('.er-mm-node')
  assert.ok(nodes.length > 0, 'the mind map must be drawn')

  // Click the node that quotes the second paragraph.
  const item = [...nodes].find((node) => (node.getAttribute('aria-label') ?? node.textContent ?? '').includes('相遇'))
    ?? nodes[nodes.length - 1]
  await act(async () => { item.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })

  // The action bar offers the jump, and the jump goes to that paragraph.
  const jumpButton = dom.window.document.querySelector('.er-mm-bar .er-btn')
  assert.ok(jumpButton, 'the jump button must appear for a node with a passage')
  await act(async () => { jumpButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  assert.deepEqual(jumps, [3], 'the reader jumps to the first sentence of that paragraph')

  await act(async () => { root.unmount() })
})

test('播客的范围可以选章节，也可以选全书', async (t) => {
  const { ReaderView } = await import('../src/ui/reader.js')
  const units = paragraphUnits()
  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)
  const requests = []
  const originalFetch = globalThis.fetch
  t.after(() => { globalThis.fetch = originalFetch })
  globalThis.fetch = async (url, options) => {
    requests.push(JSON.parse(options.body));
    return {
      status: 200,
      json: async () => ({ ok: true, result: { title: 'An episode', summary: 'A summary', dialogue: [] } }),
    };
  }

  await act(async () => {
    root.render(React.createElement(ReaderView, {
      t: (key) => key,
      book: { id: 'b1', title: 'Test Book' },
      units,
      index: 0,
      onIndexChange: () => {},
    }))
  })

  const bar = container.querySelector('.er-read-bar')
  const menu = await openMore(container)
  const button = [...menu.querySelectorAll('.er-more-row')].find((row) => row.textContent.trim() === 'podcast.open')
  await act(async () => { button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await act(async () => {})

  // The panel offers every chapter plus the whole book.
  const select = dom.window.document.querySelector('.er-pod-scope-select')
  assert.ok(select, 'the scope switcher must be there')
  const options = [...select.options].map((option) => option.value)
  assert.equal(options.length, 2, 'one chapter plus the whole book')
  assert.equal(options[1], 'book')

  // Generating with the chapter selected asks for that chapter.
  const generate = [...dom.window.document.querySelectorAll('.er-pod-head button')].find((entry) => entry.textContent === 'podcast.generate')
  await act(async () => { generate.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await act(async () => {})
  const chapterRequest = requests.find((request) => request.method === 'podcast')
  assert.ok(chapterRequest, 'the episode must be requested')
  assert.equal(chapterRequest.payload.scope, 'chapter')

  // Switching to the whole book asks for the book instead.
  requests.length = 0
  await act(async () => {
    select.value = 'book'
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }))
  })
  await act(async () => {})
  await act(async () => { generate.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await act(async () => {})
  const bookRequest = requests.find((request) => request.method === 'podcast')
  assert.equal(bookRequest.payload.scope, 'book')
  assert.match(bookRequest.payload.text, /Chapter One/, 'the book digest carries the chapters')

  await act(async () => { root.unmount() })
})

test('播客播放时能插话，说完由主持人接上', async (t) => {
  const { ReaderView } = await import('../src/ui/reader.js')
  const { setPodcastsBackend, createMemoryBackend, listPodcasts } = await import('../src/lib/podcasts.js')
  const backend = createMemoryBackend([{
    id: 'pd1',
    bookId: 'b1',
    chapterKey: '0',
    scope: 'Chapter One',
    title: 'An episode',
    summary: 'A summary',
    createdAt: 1,
    dialogue: [{ speaker: 'host', text: 'Welcome to the episode.' }],
  }])
  setPodcastsBackend(backend)
  t.after(() => { setPodcastsBackend(null) })

  const units = paragraphUnits()
  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)
  const originalFetch = globalThis.fetch
  t.after(() => { globalThis.fetch = originalFetch })
  globalThis.fetch = async (url, options) => {
    const request = JSON.parse(options.body);
    if (request.method === 'asr') {
      return { status: 200, json: async () => ({ ok: true, result: { text: 'But why does he say that?' } }) };
    }
    return {
      status: 200,
      json: async () => ({ ok: true, result: { lines: [{ speaker: 'host', text: 'Good question. Let us go back to it.' }] } }),
    };
  }

  await act(async () => {
    root.render(React.createElement(ReaderView, {
      t: (key) => key,
      book: { id: 'b1', title: 'Test Book' },
      units,
      index: 0,
      onIndexChange: () => {},
    }))
  })

  const bar = container.querySelector('.er-read-bar')
  const menu = await openMore(container)
  const button = [...menu.querySelectorAll('.er-more-row')].find((row) => row.textContent.trim() === 'podcast.open')
  await act(async () => { button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await act(async () => {})

  // Pick the episode, so there is something to talk about.
  const episode = dom.window.document.querySelector('.er-pod-episode')
  assert.ok(episode, 'the episode must be listed')
  await act(async () => { episode.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })

  // jsdom cannot record, so the microphone is gone and the text box takes
  // its place. That is the same thing the desktop app runs into.
  const mic = dom.window.document.querySelector('.er-pod-mic')
  assert.equal(mic, null, 'a window that cannot record shows no microphone')
  assert.ok(dom.window.document.querySelector('.er-pod-talk-note'), 'the panel explains why')

  // Typing the interjection sends it to the host.
  const field = dom.window.document.querySelector('.er-pod-talk-input')
  assert.ok(field, 'the text box must be there')
  await typeInto(field, 'But why does he say that?')
  const send = dom.window.document.querySelector('.er-pod-talk-send')
  await act(async () => { send.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await act(async () => {})
  await act(async () => {})

  // The learner's line and the host's answer are both in the episode now.
  const stored = await listPodcasts('b1')
  const dialogue = stored[0].dialogue.map((line) => line.text)
  assert.ok(dialogue.includes('But why does he say that?'), 'the learner line is kept')
  assert.ok(dialogue.includes('Good question. Let us go back to it.'), 'the host answered')
  const transcript = dom.window.document.querySelector('.er-pod-lines').textContent
  assert.match(transcript, /But why does he say that\?/)

  await act(async () => { root.unmount() })
})

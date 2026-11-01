/**
 * UI test for the playback options of the reader: the trigger that sits in
 * the foot bar, the panel it opens in the body, the range the read-aloud
 * covers, the repeats and the clock that stops it.
 *
 * The wording of a label may change at any time, so the fake translator
 * renders the key and the parameters it was given: the assertions look at the
 * keys, at the numbers and at the structural attributes — `aria-pressed`,
 * `aria-checked`, `disabled` — and never at a translated sentence.
 *
 * Run: node --test tests/playback-ui.test.mjs
 */
import './dom-setup.mjs'
import assert from 'node:assert/strict'
import test from 'node:test'
import { dom } from './dom-setup.mjs'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { act } from 'react'

/**
 * The translator used by the tests: the key, plus the parameters it was
 * called with, so that a number in the text can be asserted on.
 *
 * @param {string} key - the translation key
 * @param {object} [params] - the values the label is filled with
 * @returns {string} the rendered label
 */
const t = (key, params) => {
  if (!params) return key
  const parts = Object.entries(params).map(([name, value]) => `${name}=${value}`)
  return `${key}(${parts.join(',')})`
}

/**
 * A book with two chapters. The first chapter has two paragraphs — three
 * sentences and one — and the second chapter has a single paragraph. The
 * chapter range therefore covers more than one paragraph, and it differs from
 * the whole book.
 *
 * @returns {object[]} the sentence units
 */
function playbackUnits() {
  const make = (id, chapterIndex, chapterTitle, paragraphIndex, sentenceIndex, text, words) => ({
    id,
    chapterIndex,
    chapterTitle,
    paragraphIndex,
    sentenceIndex,
    text,
    words,
  })
  return [
    make('u1', 0, 'Chapter One', 0, 0, 'The first sentence ends here.', [
      { text: 'The', clean: 'the', start: 0, end: 3 },
      { text: 'first', clean: 'first', start: 4, end: 9 },
      { text: 'sentence', clean: 'sentence', start: 10, end: 18 },
      { text: 'ends', clean: 'ends', start: 19, end: 23 },
      { text: 'here.', clean: 'here', start: 24, end: 29 },
    ]),
    make('u2', 0, 'Chapter One', 0, 1, 'The second one follows.', [
      { text: 'The', clean: 'the', start: 0, end: 3 },
      { text: 'second', clean: 'second', start: 4, end: 10 },
      { text: 'one', clean: 'one', start: 11, end: 14 },
      { text: 'follows.', clean: 'follows', start: 15, end: 23 },
    ]),
    make('u3', 0, 'Chapter One', 0, 2, 'A third one closes the paragraph.', [
      { text: 'A', clean: 'a', start: 0, end: 1 },
      { text: 'third', clean: 'third', start: 2, end: 7 },
      { text: 'one', clean: 'one', start: 8, end: 11 },
      { text: 'closes', clean: 'closes', start: 12, end: 18 },
      { text: 'the', clean: 'the', start: 19, end: 22 },
      { text: 'paragraph.', clean: 'paragraph', start: 23, end: 33 },
    ]),
    make('u4', 0, 'Chapter One', 1, 0, 'The next paragraph starts.', [
      { text: 'The', clean: 'the', start: 0, end: 3 },
      { text: 'next', clean: 'next', start: 4, end: 8 },
      { text: 'paragraph', clean: 'paragraph', start: 9, end: 18 },
      { text: 'starts.', clean: 'starts', start: 19, end: 26 },
    ]),
    make('u5', 1, 'Chapter Two', 2, 0, 'The last chapter has one paragraph.', [
      { text: 'The', clean: 'the', start: 0, end: 3 },
      { text: 'last', clean: 'last', start: 4, end: 8 },
      { text: 'chapter', clean: 'chapter', start: 9, end: 16 },
      { text: 'has', clean: 'has', start: 17, end: 20 },
      { text: 'one', clean: 'one', start: 21, end: 24 },
      { text: 'paragraph.', clean: 'paragraph', start: 25, end: 35 },
    ]),
  ]
}

/**
 * Render the reader with the playback fixture.
 *
 * @returns {Promise<{container: Element, root: object}>} the mounted reader
 */
async function renderReader() {
  const { ReaderView } = await import('../src/ui/reader.js')
  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)
  await act(async () => {
    root.render(React.createElement(ReaderView, {
      t,
      book: { id: 'b1', title: 'Test Book' },
      units: playbackUnits(),
      index: 0,
      onIndexChange: () => {},
    }))
  })
  return { container, root }
}

/**
 * The button that opens the playback options.
 *
 * @param {Element} container - the rendered reader
 * @returns {Element} the trigger
 */
function triggerOf(container) {
  const trigger = container.querySelector('.er-play-anchor button')
  assert.ok(trigger, 'the playback trigger must exist')
  return trigger
}

/**
 * Click an element the way the learner does.
 *
 * @param {Element} element - the element to click
 */
async function click(element) {
  await act(async () => {
    element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
  })
}

/**
 * Open the playback panel and return it.
 *
 * @param {Element} container - the rendered reader
 * @returns {Promise<Element>} the panel, which lives in the body
 */
async function openPanel(container) {
  await click(triggerOf(container))
  const panel = dom.window.document.querySelector('.er-play-panel')
  assert.ok(panel, 'the playback panel must open')
  return panel
}

/**
 * The three range buttons of the panel.
 *
 * @param {Element} panel - the playback panel
 * @returns {Element[]} the paragraph, chapter and whole book buttons
 */
function rangeButtons(panel) {
  const buttons = [...panel.querySelectorAll('.er-play-segment-item')]
  assert.equal(buttons.length, 3, 'the range has three choices')
  return buttons
}

/**
 * Pick a value in one of the panel's selects.
 *
 * @param {Element} select - the select to drive
 * @param {string} value - the value to choose
 */
async function choose(select, value) {
  await act(async () => {
    select.value = value
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }))
  })
}

/**
 * Remove the reader and everything it left in the body.
 *
 * @param {Element} container - the rendered reader
 * @param {object} root - the React root
 */
async function unmount(container, root) {
  await act(async () => { root.unmount() })
  container.remove()
  dom.window.document.querySelectorAll('.er-play-panel').forEach((panel) => panel.remove())
}

test('the playback trigger sits in the foot bar and the panel is closed at first', async (t) => {
  const { container, root } = await renderReader()
  t.after(async () => { await unmount(container, root) })

  const foot = container.querySelector('.er-read-foot')
  assert.ok(foot, 'the foot bar must exist')

  // The trigger lives in an anchor, so the panel can be placed above it.
  const anchor = foot.querySelector('.er-play-anchor')
  assert.ok(anchor, 'the playback trigger must sit in the foot bar')
  const trigger = triggerOf(container)
  assert.equal(trigger.getAttribute('aria-expanded'), 'false', 'the panel starts closed')

  // The badge names the range that plays.
  const badge = trigger.querySelector('.er-play-badge')
  assert.ok(badge, 'the trigger carries a badge')
  assert.match(badge.textContent, /reader\.playRangeParagraph/)

  // Nothing is in the document before the trigger is clicked.
  assert.equal(dom.window.document.querySelector('.er-play-panel'), null)
})

test('clicking the trigger opens the panel in the body', async (t) => {
  const { container, root } = await renderReader()
  t.after(async () => { await unmount(container, root) })

  const trigger = triggerOf(container)
  await click(trigger)

  // The panel floats in the body: nothing inside the reader may clip it.
  const panel = dom.window.document.querySelector('.er-play-panel')
  assert.ok(panel, 'the playback panel must open')
  assert.ok(dom.window.document.body.contains(panel), 'the panel lives in the body')
  assert.equal(container.querySelector('.er-play-panel'), null, 'the panel must not live inside the reader')

  // The trigger reports that it is open.
  assert.equal(trigger.getAttribute('aria-expanded'), 'true')
})

test('the range buttons mark the picked range and the badge follows', async (t) => {
  const { container, root } = await renderReader()
  t.after(async () => { await unmount(container, root) })

  const panel = await openPanel(container)
  const [paragraph, chapter, book] = rangeButtons(panel)

  // The paragraph is the range that plays by default.
  assert.equal(paragraph.getAttribute('aria-pressed'), 'true')
  assert.equal(chapter.getAttribute('aria-pressed'), 'false')
  assert.equal(book.getAttribute('aria-pressed'), 'false')

  // The badge names the range that is playing.
  const badge = triggerOf(container).querySelector('.er-play-badge')
  const before = badge.textContent
  assert.match(before, /reader\.playRangeParagraph/)

  // Picking the chapter marks it and unmarks the others.
  await click(chapter)
  assert.equal(chapter.getAttribute('aria-pressed'), 'true')
  assert.equal(paragraph.getAttribute('aria-pressed'), 'false')
  assert.equal(book.getAttribute('aria-pressed'), 'false')

  // The badge follows the choice.
  assert.notEqual(badge.textContent, before, 'the badge must change')
  assert.match(badge.textContent, /reader\.playRangeChapter/)
  assert.doesNotMatch(badge.textContent, /reader\.playRangeParagraph/)
})

test('the repeat switch turns the loop on and the count follows', async (t) => {
  const { container, root } = await renderReader()
  t.after(async () => { await unmount(container, root) })

  const panel = await openPanel(container)

  const loopSwitch = panel.querySelector('button.er-switch[role="switch"]')
  assert.ok(loopSwitch, 'the repeat switch must exist')
  assert.equal(loopSwitch.getAttribute('aria-checked'), 'false', 'the repeat starts off')

  // The count cannot be picked while the repeat is off.
  const selects = panel.querySelectorAll('select.er-play-select')
  assert.equal(selects.length, 2, 'the count and the clock are two selects')
  const count = selects[0]
  const limit = selects[1]
  assert.equal(count.disabled, true, 'the repeat count is locked while the repeat is off')
  assert.equal(limit.disabled, false, 'the clock is always available')

  // Turning the repeat on unlocks the count.
  await click(loopSwitch)
  assert.equal(loopSwitch.getAttribute('aria-checked'), 'true')
  assert.equal(count.disabled, false, 'the repeat count is free now')

  // The badge names the repeats as well: three passes by default.
  const badge = triggerOf(container).querySelector('.er-play-badge')
  assert.match(badge.textContent, /reader\.playRangeParagraph/)
  assert.match(badge.textContent, /×3/)
})

test('the two selects carry the documented choices', async (t) => {
  const { container, root } = await renderReader()
  t.after(async () => { await unmount(container, root) })

  const panel = await openPanel(container)
  const [count, limit] = panel.querySelectorAll('select.er-play-select')

  // The repeats: a few times, or until the learner stops it.
  assert.deepEqual([...count.options].map((option) => option.value), ['2', '3', '5', '10', '0'])
  assert.equal(count.value, '3', 'three passes by default')

  // The clock: off, or ten minutes, half an hour, an hour, two hours.
  assert.deepEqual([...limit.options].map((option) => option.value), ['0', '10', '30', '60', '120'])
  assert.equal(limit.value, '0', 'the read-aloud is not limited by default')
})

test('the summary hint follows the repeat count and the time limit', async (t) => {
  const { container, root } = await renderReader()
  t.after(async () => { await unmount(container, root) })

  const panel = await openPanel(container)
  const hint = panel.querySelector('.er-play-hint')
  assert.ok(hint, 'the panel ends with a summary line')
  const before = hint.textContent

  // The repeat has to be on before the count means anything.
  await click(panel.querySelector('button.er-switch[role="switch"]'))

  // Five passes instead of three.
  const [count, limit] = panel.querySelectorAll('select.er-play-select')
  await choose(count, '5')
  assert.notEqual(hint.textContent, before, 'the summary must follow the settings')
  assert.match(hint.textContent, /reader\.playSummaryRepeats\(n=5\)/)

  // The read-aloud stops after thirty minutes.
  await choose(limit, '30')
  assert.match(hint.textContent, /reader\.playSummaryLimit\(n=30\)/)
  assert.match(hint.textContent, /30/, 'the summary names the minutes it stops after')
})

test('the caption counts the paragraphs the chapter covers', async (t) => {
  const { container, root } = await renderReader()
  t.after(async () => { await unmount(container, root) })

  const panel = await openPanel(container)
  const [, chapter] = rangeButtons(panel)
  await click(chapter)

  // The chapter holds two paragraphs, the whole book three. The count sits
  // beside the caption of the range, not in the summary line.
  const note = panel.querySelector('.er-play-caption-note')
  assert.ok(note, 'the caption carries the size of the range')
  assert.match(note.textContent, /reader\.playSummarySegments\(n=2\)/)
})

test('clicking outside the panel closes it', async (t) => {
  const { container, root } = await renderReader()
  t.after(async () => { await unmount(container, root) })

  const trigger = triggerOf(container)
  await openPanel(container)
  assert.ok(dom.window.document.querySelector('.er-play-panel'))
  assert.equal(trigger.getAttribute('aria-expanded'), 'true')

  // A click somewhere else in the page closes the panel.
  await act(async () => {
    dom.window.document.body.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
  })

  assert.equal(dom.window.document.querySelector('.er-play-panel'), null, 'the panel closes')
  assert.notEqual(trigger.getAttribute('aria-expanded'), 'true', 'the trigger reports that it is closed')
})

test('the escape key closes the panel', async (t) => {
  const { container, root } = await renderReader()
  t.after(async () => { await unmount(container, root) })

  const trigger = triggerOf(container)
  await openPanel(container)
  assert.ok(dom.window.document.querySelector('.er-play-panel'))

  await act(async () => {
    dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })

  assert.equal(dom.window.document.querySelector('.er-play-panel'), null, 'the panel closes')
  assert.notEqual(trigger.getAttribute('aria-expanded'), 'true')
})

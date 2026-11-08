/**
 * The read-aloud chain: the reader reads a range of paragraphs, one after
 * another, repeats it as many times as the learner asked for, and the page
 * follows the reading without cutting the speech off.
 *
 * Run: node --test tests/playback-chain.test.mjs
 */
import './dom-setup.mjs'
import assert from 'node:assert/strict'
import test from 'node:test'
import { dom } from './dom-setup.mjs'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { act } from 'react'

/** The translator used by the test: the key is enough to assert on. */
const t = (key, values) => (values === undefined
  ? key
  : `${key}(${Object.entries(values).map(([name, value]) => `${name}=${value}`).join(',')})`)

/**
 * Build a sentence unit with its word list.
 * @param {number} id - the unit id
 * @param {number} chapterIndex - the chapter the unit belongs to
 * @param {number} paragraphIndex - the paragraph the unit belongs to
 * @param {number} sentenceIndex - the sentence inside the paragraph
 * @param {string} text - the sentence
 * @returns {object} the unit
 */
function unit(id, chapterIndex, paragraphIndex, sentenceIndex, text) {
  const words = []
  let cursor = 0
  text.split(' ').forEach((word) => {
    words.push({ text: word, clean: word.toLowerCase(), start: cursor, end: cursor + word.length })
    cursor += word.length + 1
  })
  return { id, chapterIndex, chapterTitle: `Chapter ${chapterIndex + 1}`, paragraphIndex, sentenceIndex, text, words }
}

/** Three paragraphs over two chapters: two in the first, one in the second. */
const units = [
  unit('u1', 0, 0, 0, 'Alpha, one.'),
  unit('u2', 0, 0, 1, 'Alpha two.'),
  unit('u3', 0, 1, 0, 'Beta one.'),
  unit('u4', 1, 2, 0, 'Gamma one.'),
]

/**
 * A speech synthesis that ends every utterance right away: the chain of the
 * read-aloud is what this test is about, not the timing of the speech.
 */
function installFakeSpeech(options = {}) {
  // A held utterance never ends: the test can then look at the state the
  // reader shows while the speech is still running.
  const autoEnd = options.autoEnd !== false
  const spoken = []
  globalThis.speechSynthesis = {
    speak(utterance) {
      spoken.push(utterance.text)
      if (!autoEnd) return
      setTimeout(() => {
        if (typeof utterance.onend === 'function') utterance.onend()
      }, 0)
    },
    cancel() {},
    pause() {},
    resume() {},
    getVoices() { return [] },
  }
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text }
  }
  return spoken
}

/** A localStorage that keeps the playback preferences between the sessions. */
function installLocalStorage() {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)) },
    removeItem: (key) => { store.delete(key) },
  }
  return store
}

/** The one storage the reader reads its playback preferences from. */
const preferences = installLocalStorage();

/**
 * Remember the playback preferences the next render reads.
 * @param {object} settings - the preferences
 */
function rememberSettings(settings) {
  preferences.set('reader:playback', JSON.stringify(settings));
}

/** Let the pending speech callbacks run. */
async function settle(rounds = 6) {
  for (let round = 0; round < rounds; round += 1) {
    await act(async () => { await new Promise((resolve) => { setTimeout(resolve, 2) }) })
  }
}

/**
 * Render the reader and return the handles the test drives.
 *
 * The page behaves like the shell does: a move paints the new place, so the
 * reader really turns the page instead of only being told to.
 *
 * @returns {Promise<object>} the container, the root and the calls
 */
async function renderReader(options = {}) {
  const { ReaderView } = await import('../src/ui/reader.js')
  const spoken = installFakeSpeech({ autoEnd: options.holdSpeech !== true })
  const moves = []
  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)
  let current = 0
  const paint = (next) => {
    current = next
    root.render(React.createElement(ReaderView, {
      t,
      book: { id: 'b1', title: 'Test Book' },
      units: options.units ?? units,
      index: current,
      onIndexChange: (next_) => {
        moves.push(next_)
        paint(next_)
      },
    }))
  }
  await act(async () => { paint(0) })
  return { container, root, spoken, moves }
}

/** The play button of the transport bar. */
function playButton(container) {
  return container.querySelector('.er-read-foot .er-btn-primary')
}

/**
 * The button that turns the page. It lives in the bar of the active mode: the
 * player while reading, the practice bar while typing or speaking.
 *
 * @param {Element} container - the rendered reader
 * @returns {Element|undefined} the next button of the current bottom bar
 */
function nextButton(container) {
  return container.querySelector('[data-nav="next"]')
}

test('the read-aloud walks the range paragraph by paragraph', async () => {
  rememberSettings({ scope: 'paragraph', loop: false, loopCount: 3, limitMinutes: 0 })
  const { container, root, spoken, moves } = await renderReader()
  await act(async () => { playButton(container).dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await settle()

  // The paragraph scope reads the paragraph on the page: two sentences, one
  // paragraph, one reading.
  assert.deepEqual(spoken, ['Alpha, one. Alpha two.'])
  assert.ok(moves.length === 0, 'the reader stays on the paragraph it is reading')
  await act(async () => { root.unmount() })
})

test('the chapter scope reads the whole chapter and the page follows it', async () => {
  rememberSettings({ scope: 'chapter', loop: false, loopCount: 3, limitMinutes: 0 })
  const { container, root, spoken, moves } = await renderReader()
  await act(async () => { playButton(container).dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await settle()

  // The chapter holds two paragraphs: the first one is read, then the reader
  // moves on to the second one and reads it too.
  assert.deepEqual(spoken, ['Alpha, one. Alpha two.', 'Beta one.'])
  assert.deepEqual(moves, [2], 'the reader moves to the paragraph that is spoken')
  await act(async () => { root.unmount() })
})

test('the book scope reads every paragraph of the book', async () => {
  rememberSettings({ scope: 'book', loop: false, loopCount: 3, limitMinutes: 0 })
  const { container, root, spoken } = await renderReader()
  await act(async () => { playButton(container).dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await settle()

  assert.deepEqual(spoken, ['Alpha, one. Alpha two.', 'Beta one.', 'Gamma one.'])
  await act(async () => { root.unmount() })
})

test('the range is played as many times as the learner asked for', async () => {
  rememberSettings({ scope: 'chapter', loop: true, loopCount: 2, limitMinutes: 0 })
  const { container, root, spoken } = await renderReader()
  await act(async () => { playButton(container).dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await settle()

  // Two paragraphs, played twice: four readings, then the playback ends.
  assert.deepEqual(spoken, [
    'Alpha, one. Alpha two.',
    'Beta one.',
    'Alpha, one. Alpha two.',
    'Beta one.',
  ])
  await act(async () => { root.unmount() })
})

test('the playback stops when the learner stops it', async () => {
  rememberSettings({ scope: 'book', loop: true, loopCount: 3, limitMinutes: 0 })
  const { container, root, spoken } = await renderReader()
  await act(async () => { playButton(container).dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await settle(2)

  const before = spoken.length
  assert.ok(before > 0, 'the reading started')
  await act(async () => { playButton(container).dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await settle(2)
  const after = spoken.length
  await settle(4)
  assert.equal(spoken.length, after, 'a stopped playback stays stopped')
  await act(async () => { root.unmount() })
})

test('the learner moving the reader stops the reading', async () => {
  rememberSettings({ scope: 'book', loop: false, loopCount: 3, limitMinutes: 0 })
  const { container, root, spoken } = await renderReader()
  await act(async () => { playButton(container).dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await settle(2)

  const next = nextButton(container)
  assert.ok(next, 'the next button must exist')
  await act(async () => { next.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await settle(4)

  const stopped = spoken.length
  await settle(4)
  assert.equal(spoken.length, stopped, 'the reading does not carry on after the learner moved on')
  await act(async () => { root.unmount() })
})

test('with the auto-play on, the place the learner moves to is read aloud', async () => {
  rememberSettings({ scope: 'paragraph', loop: false, loopCount: 3, limitMinutes: 0, autoPlay: true })
  const { container, root, spoken } = await renderReader()
  await act(async () => { nextButton(container).dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await settle(4)

  // The learner turned the page: the new sentence is read without a press of
  // the play button.
  assert.deepEqual(spoken, ['Alpha two.'])
  await act(async () => { root.unmount() })
})

test('without the auto-play, a move alone says nothing', async () => {
  rememberSettings({ scope: 'paragraph', loop: false, loopCount: 3, limitMinutes: 0, autoPlay: false })
  const { container, root, spoken } = await renderReader()
  await act(async () => { nextButton(container).dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await settle(4)

  assert.deepEqual(spoken, [], 'the reading waits for the play button')
  await act(async () => { root.unmount() })
})

test('the read-aloud moving the page does not start a second reading', async () => {
  rememberSettings({ scope: 'chapter', loop: false, loopCount: 3, limitMinutes: 0, autoPlay: true })
  const { container, root, spoken } = await renderReader()
  await act(async () => { playButton(container).dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await settle(6)

  // The read-aloud turns the page itself. Each paragraph is read once: the
  // auto-play must not speak over it.
  assert.deepEqual(spoken, ['Alpha, one. Alpha two.', 'Beta one.'])
  await act(async () => { root.unmount() })
})

test('the auto-play stays quiet while the learner is the one talking', async () => {
  rememberSettings({ scope: 'paragraph', loop: false, loopCount: 3, limitMinutes: 0, autoPlay: true })
  const { container, root, spoken } = await renderReader()
  // The speaking mode: the learner reads the unit aloud.
  const speakMode = [...container.querySelectorAll('.er-mode')]
    .find((button) => button.textContent === 'reader.modeSpeak')
  assert.ok(speakMode, 'the speaking mode button must exist')
  await act(async () => { speakMode.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await act(async () => { nextButton(container).dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await settle(4)

  assert.deepEqual(spoken, [], 'the machine does not talk over the learner')
  await act(async () => { root.unmount() })
})

test('the typing bar carries the read-aloud state instead of a floating pill', async () => {
  // The speech is held open: the state row only exists while the reading runs.
  const { container, root } = await renderReader({ holdSpeech: true })
  await switchToTyping(container)

  // "Listen once" is the typing mode's own play button, now that the player
  // bar belongs to the reading mode.
  const hearOnce = container.querySelector('.er-mode-dock [title="reader.listenOnce"]')
  assert.ok(hearOnce, 'the typing bar offers listening once')
  await act(async () => { hearOnce.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await settle(2)

  // The state row lives inside the typing bar: a floating pill would cover the
  // word input, and on a phone there would be no player under it at all.
  const statuses = container.querySelectorAll('.er-play-status')
  assert.equal(statuses.length, 1, 'the read-aloud state is shown once, not twice')
  assert.ok(statuses[0].closest('.er-mode-dock'), 'the state is a row of the typing bar')
  assert.ok(statuses[0].querySelector('.er-play-status-pause'), 'the typing bar can pause the read-aloud')

  await act(async () => { root.unmount() })
  await settle(4)
})

/** Switch the reader into the typing mode. */
async function switchToTyping(container) {
  const button = [...container.querySelectorAll('.er-mode')]
    .find((entry) => entry.textContent === 'reader.modeType')
  assert.ok(button, 'the typing mode button must exist')
  await act(async () => { button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
}

/** Type a word into the typing field the way a learner would. */
async function typeWord(container, value) {
  const field = container.querySelector('.er-input-row input')
  assert.ok(field, 'the typing field must exist')
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set
  await act(async () => {
    setter.call(field, value)
    field.dispatchEvent(new dom.window.InputEvent('input', { bubbles: true }))
  })
}

test('the typing mode reads one word at a time', async () => {
  rememberSettings({ scope: 'paragraph', loop: false, loopCount: 3, limitMinutes: 0, autoPlay: false })
  const { container, root, spoken } = await renderReader()
  await switchToTyping(container)
  await settle(4)

  // Only the word the learner is on: the whole sentence would run away from
  // the hand.
  assert.deepEqual(spoken, ['Alpha'])

  // The learner writes it: the next word is read.
  await typeWord(container, 'Alpha ')
  await settle(4)
  assert.deepEqual(spoken, ['Alpha', 'one'])
  await act(async () => { root.unmount() })
})

test('a word typed wrong is said again', async () => {
  rememberSettings({ scope: 'paragraph', loop: false, loopCount: 3, limitMinutes: 0, autoPlay: false })
  const { container, root, spoken } = await renderReader()
  await switchToTyping(container)
  await settle(4)
  assert.deepEqual(spoken, ['Alpha'])

  await typeWord(container, 'Alfa ')
  await settle(4)
  assert.deepEqual(spoken, ['Alpha', 'Alpha'], '写错的词再读一遍')
  await act(async () => { root.unmount() })
})

test('the word to type carries no sentence punctuation', async () => {
  rememberSettings({ scope: 'paragraph', loop: false, loopCount: 3, limitMinutes: 0, autoPlay: false })
  const { container, root } = await renderReader()
  await switchToTyping(container)
  await settle(4)

  // The book writes "better," — the comma belongs to the sentence, not to the
  // word the learner is asked to type.
  const field = container.querySelector('.er-input-row input')
  assert.equal(field.getAttribute('placeholder'), 'Alpha')
  await act(async () => { root.unmount() })
})

test('a word typed with its comma is not a mistake', async () => {
  rememberSettings({ scope: 'paragraph', loop: false, loopCount: 3, limitMinutes: 0, autoPlay: false })
  const { container, root, spoken } = await renderReader()
  await switchToTyping(container)
  await settle(4)

  // The learner types what they see in the book, comma and all.
  await typeWord(container, 'Alpha, ')
  await settle(4)
  assert.deepEqual(spoken, ['Alpha', 'one'], 'the word was accepted, so the reading moved on')
  await act(async () => { root.unmount() })
})

test('the comma is drawn once, not twice', async () => {
  rememberSettings({ scope: 'paragraph', loop: false, loopCount: 3, limitMinutes: 0, autoPlay: false })
  const { container, root } = await renderReader()
  await switchToTyping(container)
  await settle(4)

  await typeWord(container, 'Alpha,')
  await settle(2)

  // The word in the text keeps the book's own comma, and only one of them.
  const word = container.querySelector('.er-word')
  assert.ok(word, 'the word must be rendered')
  assert.equal(word.textContent, 'Alpha,')
  await act(async () => { root.unmount() })
})

test("the apostrophe in a word is the learner's to type", async () => {
  rememberSettings({ scope: 'paragraph', loop: false, loopCount: 3, limitMinutes: 0, autoPlay: false })
  const withApostrophe = [unit('u1', 0, 0, 0, "Don't stop.")]
  const { container, root } = await renderReader({ units: withApostrophe })
  await switchToTyping(container)
  await settle(4)

  // The apostrophe belongs to the word, so it is part of what is asked for.
  const field = container.querySelector('.er-input-row input')
  assert.equal(field.getAttribute('placeholder'), "Don't")

  // Typing it without the apostrophe is still the same word.
  await typeWord(container, 'Dont ')
  await settle(4)
  assert.equal(field.getAttribute('placeholder'), 'stop', 'the word was accepted')
  await act(async () => { root.unmount() })
})

/**
 * Auto-next, end to end: with the switch on, a sentence read well moves the
 * reader to the next one and starts recording it without a second click.
 */
import './dom-setup.mjs'
import assert from 'node:assert/strict'
import test from 'node:test'
import { dom } from './dom-setup.mjs'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { act } from 'react'

const t = (key) => key

const SENTENCES = [
  'The brass lantern sat on the workbench.',
  'Mara turned it once and watched the light.',
  'It was the last piece her teacher had shaped.',
]

function makeUnits() {
  return SENTENCES.map((text, index) => ({
    id: 'u' + index,
    chapterIndex: 0,
    chapterTitle: 'Chapter One',
    paragraphIndex: 0,
    sentenceIndex: index,
    text,
    words: text.split(/\s+/).map((word, wordIndex) => ({ text: word, start: 0, end: 0, wordIndex })),
  }))
}

/** A MediaRecorder that reports having recorded something. */
function installRecorder() {
  const state = { starts: 0, stops: 0, chunks: 0 }
  globalThis.MediaRecorder = class {
    constructor() {
      this.mimeType = 'audio/webm'
      this.ondataavailable = null
      this.onstop = null
      this.onerror = null
      state.starts += 1
    }

    start() {
      setTimeout(() => { state.chunks += 1; this.ondataavailable?.({ data: new Uint8Array(9000) }) }, 5)
    }

    stop() {
      state.stops += 1
      this.onstop?.()
    }
  }
  globalThis.Blob = dom.window.Blob
  globalThis.FileReader = dom.window.FileReader
  Object.defineProperty(dom.window.navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) },
  })
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator })
  return state
}

/** Mount a reader whose page really moves, and answer the host. */
async function mountReader() {
  const { ReaderView } = await import('../src/ui/reader.js')
  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)
  const moves = []
  function Harness() {
    const [index, setIndex] = React.useState(0)
    return React.createElement(ReaderView, {
      t,
      book: { id: 'b1', title: 'Test Book' },
      units: makeUnits(),
      index,
      onIndexChange: (next) => { moves.push(next); setIndex(next) },
    })
  }
  await act(async () => { root.render(React.createElement(Harness)) })
  return { container, root, moves }
}

test('a well-read sentence rolls into the next one, recording', async (t2) => {
  const recorder = installRecorder()
  const calls = []
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init?.body ?? '{}')
    calls.push(body.method)
    const result = body.method === 'asr'
      ? { text: SENTENCES[0] }
      : body.method === 'status' ? { minimax: true, localTts: null } : {}
    return { ok: true, status: 200, json: async () => ({ ok: true, result }) }
  }
  t2.after(() => { delete globalThis.MediaRecorder; delete globalThis.fetch })

  const { container, root, moves } = await mountReader()

  // Speak mode, then the drill switch, then the recording.
  const speak = [...container.querySelectorAll('.er-mode-button')].find((button) => button.getAttribute('title') === 'reader.modeSpeak')
  await act(async () => { speak.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  const auto = container.querySelector('.er-speak-auto')
  assert.ok(auto, 'the bar carries the auto-next switch')
  assert.equal(auto.getAttribute('aria-pressed'), 'false')
  await act(async () => { auto.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  assert.equal(auto.getAttribute('aria-pressed'), 'true')

  // Sentence scope: one take is one sentence, which is what "next sentence"
  // means for the drill.
  const aids = container.querySelector('.er-aids-button')
  await act(async () => { aids.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  const sentenceChip = [...dom.window.document.querySelectorAll('.er-modes-panel .er-segment.is-quiet .er-segment-item')]
    .find((chip) => chip.textContent === 'reader.scopeSentence')
  await act(async () => { sentenceChip.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await act(async () => { aids.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })

  const start = container.querySelector('.er-speak-start')
  await act(async () => { start.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)) })
  // Finish the take by hand: the silence detector needs a real microphone.
  // The node is re-queried because the button now says Stop.
  const stop = container.querySelector('.er-speak-start')
  console.log('DEBUG before stop', stop === null ? 'null' : stop.textContent, 'dots', container.querySelectorAll('.er-speak-recording-dots').length)
  await act(async () => { stop.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  console.log('DEBUG after stop', container.querySelector('.er-speak-start')?.textContent, 'pending', container.querySelector('.er-speak-spinner') !== null)

  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 300)) })
  // The analysis lands, the page moves, and the next recording starts.
  let restarted = false
  for (let i = 0; i < 40; i += 1) {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 100)) })
    if (moves.length > 0 && recorder.starts >= 2) { restarted = true; break }
  }
  console.log('DEBUG dock', JSON.stringify(container.querySelector('.er-mode-dock')?.textContent), 'error', container.querySelector('.er-error')?.textContent)
  console.log('DEBUG calls', JSON.stringify(calls), 'starts', recorder.starts, 'stops', recorder.stops, 'chunks', recorder.chunks, 'moves', JSON.stringify(moves), 'ok', container.querySelectorAll('.er-word.is-ok').length, 'status', container.querySelector('.er-speak-status-text')?.textContent)
  assert.deepEqual(moves, [1], 'the reader moved to the next sentence')
  assert.ok(restarted, 'the next sentence started recording by itself')

  await act(async () => { root.unmount() })
})

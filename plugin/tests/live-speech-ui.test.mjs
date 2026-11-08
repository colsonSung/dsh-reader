/**
 * The read-aloud marks the words while the learner is still speaking.
 *
 * The unit tests pin the loop; this one pins the wiring: a fake microphone and
 * a fake Host answer a partial transcription, and the passage must already
 * carry the match marks before the recording is stopped.
 */
import './dom-setup.mjs'
import assert from 'node:assert/strict'
import test from 'node:test'
import { dom } from './dom-setup.mjs'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { act } from 'react'

const t = (key) => key

/** Four short sentences, so the marks are easy to count. */
const UNITS = [
  'The brass lantern sat on the workbench.',
  'Mara turned it once and watched the light.',
  'It was the last piece her teacher had shaped.',
  'She set it down beside the ledger.',
].map((text, index) => ({
  id: 'u' + index,
  chapterIndex: 0,
  chapterTitle: 'Chapter One',
  paragraphIndex: 0,
  sentenceIndex: index,
  text,
  words: text.split(/\s+/).map((word, wordIndex) => ({ text: word, start: 0, end: 0, wordIndex })),
}))

/** A MediaRecorder that hands out one chunk, like a real one does. */
class FakeMediaRecorder {
  constructor() {
    this.mimeType = 'audio/webm'
    this.ondataavailable = null
    this.onstop = null
    this.onerror = null
  }

  start() {
    this.timer = setTimeout(() => {
      this.ondataavailable?.({ data: new Uint8Array(9000) })
    }, 20)
  }

  stop() {
    clearTimeout(this.timer)
    this.onstop?.()
  }
}

/** A fake Host: /api/reader answers the small set of methods this test needs. */
function fakeHost(transcript) {
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init?.body ?? '{}')
    const result = body.method === 'asr'
      ? { text: transcript }
      : body.method === 'status'
        ? { minimax: true, localTts: null }
        : {}
    return { ok: true, status: 200, json: async () => ({ ok: true, result }) }
  }
}

test('the words light up while the recording is still running', async (t2) => {
  // The browser pieces the recorder needs, faked for jsdom.
  globalThis.MediaRecorder = FakeMediaRecorder
  globalThis.Blob = dom.window.Blob
  globalThis.FileReader = dom.window.FileReader
  Object.defineProperty(dom.window.navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) },
  })
  // The recorder reads navigator from the global object, and Node has its own
  // navigator: point it at the jsdom one for this test.
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator })
  fakeHost('The brass lantern sat on the')
  t2.after(() => {
    delete globalThis.MediaRecorder
    delete globalThis.fetch
  })

  const { ReaderView } = await import('../src/ui/reader.js')
  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)
  await act(async () => {
    root.render(React.createElement(ReaderView, {
      t,
      book: { id: 'b1', title: 'Test Book' },
      units: UNITS,
      index: 0,
      onIndexChange: () => {},
    }))
  })

  // Speak mode, then the record button.
  // The practice mode is one click in the bar.
  const speakChip = [...container.querySelectorAll('.er-mode-button')]
    .find((chip) => chip.getAttribute('title') === 'reader.modeSpeak')
  await act(async () => { speakChip.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  const record = container.querySelector('.er-speak-start')
  assert.ok(record, 'the read-aloud bar offers the record button')
  await act(async () => { record.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })

  // The live loop asks for a transcription after a couple of seconds; the marks
  // must be there while the learner is still recording.
  const deadline = Date.now() + 8000
  let matched = 0
  while (Date.now() < deadline) {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 300)) })
    matched = container.querySelectorAll('.er-word.is-ok').length
    if (matched > 0) break
  }
  assert.ok(matched >= 3, 'the matched words are marked during the recording, saw ' + matched)
  const bar = container.querySelector('.er-mode-dock')
  assert.match(bar.textContent, /reader\.recordingMatched/, 'the bar says how much has matched')

  await act(async () => { root.unmount() })
})

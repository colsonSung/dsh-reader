/**
 * The reading page carries its own shortcuts: every paragraph offers the typing
 * and the read-aloud practice right where it is, and the read-aloud bar prints
 * the short verdict instead of hiding it behind a click.
 */
import './dom-setup.mjs'
import assert from 'node:assert/strict'
import test from 'node:test'
import { dom } from './dom-setup.mjs'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { act } from 'react'

const t = (key) => key

const UNITS = [
  'The brass lantern sat on the workbench.',
  'Mara turned it once and watched the light.',
].map((text, index) => ({
  id: 'u' + index,
  chapterIndex: 0,
  chapterTitle: 'Chapter One',
  paragraphIndex: 0,
  sentenceIndex: index,
  text,
  words: text.split(/\s+/).map((word, wordIndex) => ({ text: word, start: 0, end: 0, wordIndex })),
}))

test('each paragraph offers typing and read-aloud next to it', async () => {
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

  const gutter = container.querySelector('.er-paragraph-actions')
  assert.ok(gutter, 'the paragraph has its gutter')
  const names = [...gutter.querySelectorAll('.er-paragraph-action')].map((button) => button.getAttribute('title'))
  assert.ok(names.includes('reader.quickType'), 'typing is one click from the paragraph')
  assert.ok(names.includes('reader.quickSpeak'), 'read-aloud is one click from the paragraph')

  // The shortcut switches the mode; the bar of that mode proves it.
  const speak = [...gutter.querySelectorAll('.er-paragraph-action')]
    .find((button) => button.getAttribute('title') === 'reader.quickSpeak')
  await act(async () => { speak.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  assert.ok(container.querySelector('.er-speak-bar'), 'the read-aloud bar opened')

  await act(async () => { root.unmount() })
})

test('the read-aloud bar shows the short verdict without opening the panel', async (t2) => {
  globalThis.MediaRecorder = class {
    constructor() {
      this.mimeType = 'audio/webm'
      this.ondataavailable = null
      this.onstop = null
      this.onerror = null
    }

    start() {
      this.timer = setTimeout(() => { this.ondataavailable?.({ data: new Uint8Array(9000) }) }, 20)
    }

    stop() {
      clearTimeout(this.timer)
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
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init?.body ?? '{}')
    const result = body.method === 'asr'
      ? { text: 'The brass lantern sat on the' }
      : body.method === 'status' ? { minimax: true, localTts: null } : {}
    return { ok: true, status: 200, json: async () => ({ ok: true, result }) }
  }
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

  // The practice mode is one click in the bar.
  const speakChip = [...container.querySelectorAll('.er-mode-button')]
    .find((chip) => chip.getAttribute('title') === 'reader.modeSpeak')
  await act(async () => { speakChip.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
  // The one button to press is its own pill on the left of the bar.
  const record = container.querySelector('.er-speak-start')
  assert.ok(record, 'the bar offers the record button')
  await act(async () => { record.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })

  const deadline = Date.now() + 9000
  let summary = null
  while (Date.now() < deadline) {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 250)) })
    summary = container.querySelector('.er-speak-summary')
    if (summary !== null) break
  }
  assert.ok(summary, 'the compact verdict appears above the bar')
  assert.match(summary.textContent, /reader\.liveMatched|reader\.feedbackVoice/, 'it carries the verdict')

  await act(async () => { root.unmount() })
})

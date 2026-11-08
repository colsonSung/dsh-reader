/**
 * The shortcut gutter belongs to one paragraph at a time, and it stays with the
 * one it was opened on. Hover alone was not enough: the gutter column is taller
 * than a short line and sits beside the text, so moving onto it left the row's
 * hover box and the next paragraph took the gutter — the last two buttons could
 * never be clicked on a one-line paragraph.
 */
import './dom-setup.mjs'
import assert from 'node:assert/strict'
import test from 'node:test'
import { dom } from './dom-setup.mjs'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { act } from 'react'

const t = (key) => key

/** Two paragraphs; the first one is a single short line. */
function makeUnits() {
  const words = (text) => text.split(/\s+/).map((word, wordIndex) => ({ text: word, start: 0, end: 0, wordIndex }))
  const first = 'Never fear!'
  const second = 'We are going to clear up the confusion and provide some prescriptive advice for each stakeholder.'
  return [
    { text: first, paragraphIndex: 0 },
    { text: second, paragraphIndex: 1 },
  ].flatMap((paragraph, paragraphIndex) => paragraph.text.split(/(?<=[.!?])\s+/).map((text, sentenceIndex) => ({
    id: 'u' + paragraphIndex + '-' + sentenceIndex,
    chapterIndex: 0,
    chapterTitle: 'Chapter One',
    paragraphIndex,
    sentenceIndex,
    text,
    words: words(text),
  })))
}

/**
 * Dispatch the event a mouse really sends: React derives pointerenter and
 * pointerleave from pointerover and pointerout.
 */
function pointer(element) {
  element.dispatchEvent(new dom.window.MouseEvent('pointerover', { bubbles: true, cancelable: true }))
}

test('the shortcut gutter stays on the paragraph it was opened on', async () => {
  const { ReaderView } = await import('../src/ui/reader.js')
  const container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)
  await act(async () => {
    root.render(React.createElement(ReaderView, {
      t,
      book: { id: 'b1', title: 'Test Book' },
      units: makeUnits(),
      index: 0,
      onIndexChange: () => {},
    }))
  })

  const rows = [...container.querySelectorAll('.er-paragraph-row')]
  assert.ok(rows.length >= 2, 'two paragraphs on the page')

  // Hovering the short paragraph opens its gutter, and only its gutter.
  await act(async () => { pointer(rows[0]) })
  assert.ok(rows[0].classList.contains('is-tools'), 'the hovered paragraph owns the gutter')
  assert.equal(container.querySelectorAll('.er-paragraph-row.is-tools').length, 1)

  // Moving onto the gutter itself must not hand it to the next paragraph: the
  // buttons are descendants of their row, so the row keeps the gutter.
  const gutter = rows[0].querySelector('.er-paragraph-actions')
  assert.ok(gutter, 'the row has its gutter')
  await act(async () => { pointer(gutter) })
  assert.ok(rows[0].classList.contains('is-tools'), 'the gutter keeps its own paragraph')
  assert.equal(container.querySelectorAll('.er-paragraph-row.is-tools').length, 1, 'no competing gutter is drawn')

  // Moving to the next paragraph hands the gutter over — one gutter, not two.
  await act(async () => { pointer(rows[1]) })
  assert.ok(rows[1].classList.contains('is-tools'))
  assert.equal(container.querySelectorAll('.er-paragraph-row.is-tools').length, 1)

  await act(async () => { root.unmount() })
})

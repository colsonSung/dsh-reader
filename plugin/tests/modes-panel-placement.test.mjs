/**
 * Floating panels must open where the button that opened them is. The reading
 * aids sit in the top bar now, and the panel opened in the top-left corner of
 * the window — over the app's own sidebar — because it still used the geometry
 * of the rail it came from. These tests pin the placement.
 */
import './dom-setup.mjs'
import assert from 'node:assert/strict'
import test from 'node:test'
import { placeModesPanel } from '../src/ui/reader.js'

test('a top-bar button opens the panel underneath itself, right-aligned', () => {
  const anchor = { left: 1120, top: 16, bottom: 46, right: 1148, below: true }
  const box = placeModesPanel({ anchor, viewportWidth: 1336, viewportHeight: 784 })
  // Right edge lines up with the button; the panel hangs below it.
  assert.equal(box.left + box.width, anchor.right)
  assert.equal(box.top, anchor.bottom + 8)
})

test('the panel stays inside a narrow window', () => {
  const anchor = { left: 760, top: 16, bottom: 46, right: 788, below: true }
  const box = placeModesPanel({ anchor, viewportWidth: 800, viewportHeight: 700 })
  assert.ok(box.left >= 12, 'the left edge stays on screen')
  assert.ok(box.left + box.width <= 800 - 12 + 1, 'the right edge stays on screen')
})

test('a bottom rail button opens the panel above and to the left', () => {
  const anchor = { left: 120, top: 700, bottom: 744, right: 180 }
  const box = placeModesPanel({ anchor, viewportWidth: 390, viewportHeight: 844, width: 300, panelHeight: 440 })
  assert.equal(box.left, 12)
  assert.ok(box.top >= 12 && box.top + 440 <= 844, 'the panel fits the phone')
})

test('with nothing to anchor to, the sheet opens at the top right', () => {
  const box = placeModesPanel({ anchor: null, viewportWidth: 1336, viewportHeight: 784 })
  assert.equal(box.left, 1336 - 300 - 16)
  assert.ok(box.top < 120, 'near the bar it was opened from')
})

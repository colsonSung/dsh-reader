/**
 * Auto-next: the switch that turns reading aloud into a drill. The rule is
 * small but it decides whether the learner keeps their own sentence or gets
 * carried into the next one, so it is pinned here.
 */
import './dom-setup.mjs'
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AUTO_NEXT_DELAY_MS,
  AUTO_NEXT_MIN_ACCURACY,
  shouldAdvance,
} from '../src/lib/auto-advance.js'

test('the switch off never advances, however well the sentence was read', () => {
  assert.equal(shouldAdvance({ enabled: false, accuracy: 1, hasNext: true }), false)
})

test('a well-read sentence with another one after it advances', () => {
  assert.equal(shouldAdvance({ enabled: true, accuracy: 0.95, hasNext: true }), true)
})

test('the bar is 80% — just under it stays put', () => {
  assert.equal(AUTO_NEXT_MIN_ACCURACY, 0.8)
  assert.equal(shouldAdvance({ enabled: true, accuracy: 0.79, hasNext: true }), false)
  assert.equal(shouldAdvance({ enabled: true, accuracy: 0.8, hasNext: true }), true)
})

test('the last sentence of the range ends the drill', () => {
  assert.equal(shouldAdvance({ enabled: true, accuracy: 1, hasNext: false }), false)
})

test('a missing or broken accuracy does not advance', () => {
  assert.equal(shouldAdvance({ enabled: true, hasNext: true }), false)
  assert.equal(shouldAdvance({ enabled: true, accuracy: null, hasNext: true }), false)
  assert.equal(shouldAdvance({ enabled: true, accuracy: Number.NaN, hasNext: true }), false)
})

test('an explicit threshold is honoured', () => {
  assert.equal(shouldAdvance({ enabled: true, accuracy: 0.7, hasNext: true, minAccuracy: 0.6 }), true)
  assert.equal(shouldAdvance({ enabled: true, accuracy: 0.7, hasNext: true, minAccuracy: 0.9 }), false)
})

test('the next recording waits a beat, not a pause', () => {
  assert.ok(AUTO_NEXT_DELAY_MS > 300 && AUTO_NEXT_DELAY_MS < 1500)
})

/**
 * End of speech: the detector decides when the reading is over so the learner
 * does not have to press stop. These tests pin its edges — a learner who is
 * still thinking, a pause in the middle of a sentence, a finished sentence.
 */
import './dom-setup.mjs'
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  END_SILENCE_MS,
  MIN_SPEECH_MS,
  SPEECH_RMS,
  createSilenceWatcher,
} from '../src/lib/speech-vad.js'

/** Feed a run of samples at the same level. */
function run(watcher, level, fromMs, toMs, step = 120) {
  let result = 'quiet'
  for (let at = fromMs; at <= toMs; at += step) result = watcher.feed(level, at)
  return result
}

test('silence before the first word does not close the microphone', () => {
  let ended = 0
  const watcher = createSilenceWatcher({ onEnd: () => { ended += 1 } })
  // Ten seconds of "still thinking" with not a word spoken.
  const state = run(watcher, 0.005, 1, 10000)
  assert.equal(state, 'quiet')
  assert.equal(ended, 0)
})

test('a short pause in the middle of a sentence is not the end', () => {
  let ended = 0
  const watcher = createSilenceWatcher({ onEnd: () => { ended += 1 } })
  run(watcher, 0.08, 1, 1500)
  // A breath, shorter than the silence window, then speech again.
  const paused = run(watcher, 0.004, 1620, 1620 + END_SILENCE_MS - 400)
  assert.equal(paused, 'quiet')
  run(watcher, 0.08, 1620 + END_SILENCE_MS - 380, 1620 + END_SILENCE_MS + 500)
  assert.equal(ended, 0)
})

test('a finished sentence ends once, after the silence window', () => {
  let ended = 0
  const watcher = createSilenceWatcher({ onEnd: () => { ended += 1 } })
  run(watcher, 0.08, 1, 2200)
  const early = run(watcher, 0.004, 2320, 2320 + END_SILENCE_MS - 300)
  assert.equal(early, 'quiet')
  const done = run(watcher, 0.004, 2320 + END_SILENCE_MS - 100, 2320 + END_SILENCE_MS + 300)
  assert.equal(done, 'ended')
  assert.equal(ended, 1)
  run(watcher, 0.1, 5000, 7000)
  assert.equal(ended, 1, 'the end is reported exactly once')
})

test('a cough is not a sentence: speech must last before silence counts', () => {
  let ended = 0
  const watcher = createSilenceWatcher({ onEnd: () => { ended += 1 } })
  run(watcher, 0.2, 1, 200)
  assert.ok(MIN_SPEECH_MS > 200)
  run(watcher, 0.002, 220, 220 + END_SILENCE_MS + 600)
  assert.equal(ended, 0, 'a 200 ms blip does not count as reading the sentence')
})

test('reset starts a new sentence', () => {
  let ended = 0
  const watcher = createSilenceWatcher({ onEnd: () => { ended += 1 } })
  run(watcher, 0.08, 1, 2000)
  run(watcher, 0.001, 2120, 2120 + END_SILENCE_MS + 200)
  assert.equal(ended, 1)
  watcher.reset()
  assert.equal(run(watcher, 0.005, 9000, 12000), 'quiet', 'the old end is forgotten')
  assert.equal(ended, 1)
})

test('the threshold is the loudness of a voice, not of a room', () => {
  assert.ok(SPEECH_RMS > 0.005 && SPEECH_RMS < 0.1, 'a sane default for a laptop microphone')
})

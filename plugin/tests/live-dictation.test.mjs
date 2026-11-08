/**
 * Live dictation: the read-aloud marks the words while the learner is still
 * speaking. The loop's choices — when to ask, when to stop, when to drop a
 * partial that arrived after the recording ended — are what these tests pin.
 */
import './dom-setup.mjs'
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MAX_PARTIAL_MS,
  MIN_PARTIAL_BYTES,
  createLiveDictation,
} from '../src/lib/live-dictation.js'

/** A clock and interval pair the test drives by hand. */
function fakeTimers() {
  let now = 0
  const tasks = []
  return {
    now: () => now,
    advance: (ms) => { now += ms },
    setInterval: (fn) => {
      tasks.push(fn)
      return tasks.length
    },
    clearInterval: (handle) => { tasks[handle - 1] = null },
    /** Run the loop once. */
    async fire() {
      const fn = tasks.find((task) => typeof task === 'function')
      if (fn === undefined) return
      await fn()
    },
    running: () => tasks.some((task) => typeof task === 'function'),
  }
}

/** A recorder snapshot of the given size. */
function snapshotOf(bytes) {
  return { blob: { size: bytes, type: 'audio/webm' }, mimeType: 'audio/webm' }
}

test('a clip that is too short is not transcribed', async () => {
  const timers = fakeTimers()
  let asked = 0
  const dictation = createLiveDictation({
    target: 'The brass lantern sat on the workbench.',
    snapshot: () => snapshotOf(100),
    toBase64: async () => 'AAAA',
    askAsr: async () => { asked += 1; return { text: 'the brass lantern' } },
    onPartial: () => {},
    timers,
  })
  dictation.start()
  await dictation.tick()
  assert.equal(asked, 0, 'a 100 byte clip says nothing')
  dictation.stop()
})

test('a partial marks the words it matched', async () => {
  const timers = fakeTimers()
  const partials = []
  const dictation = createLiveDictation({
    target: 'The brass lantern sat on the workbench.',
    snapshot: () => snapshotOf(MIN_PARTIAL_BYTES + 100),
    toBase64: async () => 'AAAA',
    askAsr: async () => ({ text: 'The brass lantern' }),
    onPartial: (update) => partials.push(update),
    timers,
  })
  dictation.start()
  await dictation.tick()
  assert.equal(partials.length, 1)
  assert.equal(partials[0].text, 'The brass lantern')
  const statuses = partials[0].aligned.words.map((word) => word.status)
  assert.deepEqual(statuses.slice(0, 3), ['ok', 'ok', 'ok'])
  dictation.stop()
})

test('a partial that lands after the recording stopped is dropped', async () => {
  const timers = fakeTimers()
  const partials = []
  let release
  const gate = new Promise((resolve) => { release = resolve })
  const dictation = createLiveDictation({
    target: 'The brass lantern sat on the workbench.',
    snapshot: () => snapshotOf(MIN_PARTIAL_BYTES + 100),
    toBase64: async () => 'AAAA',
    askAsr: async () => {
      await gate
      return { text: 'The brass lantern' }
    },
    onPartial: (update) => partials.push(update),
    timers,
  })
  dictation.start()
  const tick = dictation.tick()
  dictation.stop()
  release()
  await tick
  assert.deepEqual(partials, [], 'the final transcription owns the result')
  assert.equal(dictation.isRunning(), false)
})

test('the loop gives up on an endless recording', async () => {
  const timers = fakeTimers()
  let asked = 0
  const dictation = createLiveDictation({
    target: 'The brass lantern sat on the workbench.',
    snapshot: () => snapshotOf(MIN_PARTIAL_BYTES + 100),
    toBase64: async () => 'AAAA',
    askAsr: async () => { asked += 1; return { text: 'the brass' } },
    onPartial: () => {},
    timers,
  })
  dictation.start()
  timers.advance(MAX_PARTIAL_MS + 1)
  await dictation.tick()
  assert.equal(asked, 0, 'the loop stops instead of paying for a monologue')
  assert.equal(dictation.isRunning(), false)
})

test('start is idempotent and stop is final', () => {
  const timers = fakeTimers()
  const dictation = createLiveDictation({
    target: 'x',
    snapshot: () => null,
    toBase64: async () => '',
    askAsr: async () => ({}),
    onPartial: () => {},
    timers,
  })
  dictation.start()
  dictation.start()
  assert.equal(timers.running(), true)
  dictation.stop()
  assert.equal(timers.running(), false)
  assert.equal(dictation.isRunning(), false)
})

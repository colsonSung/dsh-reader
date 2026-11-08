/**
 * The reading voice is local first. These tests stand in for the local model and
 * for the cloud, so the order of the chain can be checked without a GPU.
 */
import './dom-setup.mjs'
import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_LOCAL_VOICES,
  isLocalVoice,
  localVoiceFor,
  speak,
} from '../src/host/speech.js'

/** A WAV header plus the given seconds of silence, 24 kHz mono 16-bit. */
function wavBytes(seconds) {
  const samples = Math.round(24000 * seconds)
  const data = Buffer.alloc(44 + samples * 2)
  data.write('RIFF', 0)
  data.writeUInt32LE(36 + samples * 2, 4)
  data.write('WAVE', 8)
  data.write('fmt ', 12)
  data.writeUInt32LE(16, 16)
  data.writeUInt16LE(1, 20)
  data.writeUInt16LE(1, 22)
  data.writeUInt32LE(24000, 24)
  data.writeUInt32LE(24000 * 2, 28)
  data.writeUInt16LE(2, 32)
  data.writeUInt16LE(16, 34)
  data.write('data', 36)
  data.writeUInt32LE(samples * 2, 40)
  return data
}

/** The pieces the local service needs, faked. */
function localDeps(overrides = {}) {
  const spawned = []
  const requests = []
  // The service's launcher and script must exist for the chain to consider the
  // local model installed; the spawn itself is faked below.
  const local = {
    enabled: true,
    python: '/bin/sh',
    script: fileURLToPath(import.meta.url),
    voices: { ...DEFAULT_LOCAL_VOICES },
    idleSeconds: 600,
  }
  const spawnImpl = () => {
    const handlers = {}
    const proc = {
      stdout: { on: (event, fn) => { if (event === 'data') handlers.data = fn } },
      stderr: { on: () => {} },
      on: (event, fn) => { if (event === 'exit') handlers.exit = fn },
      kill: () => {},
    }
    spawned.push({ proc, handlers })
    setTimeout(() => handlers.data?.(Buffer.from('port=4321\n')), 0)
    return proc
  }
  const fetchImpl = async (url, init) => {
    requests.push({ url, init })
    if (url.endsWith('/health')) {
      return { ok: true, json: async () => ({ ok: true, voices: local.voices }) }
    }
    return { ok: true, arrayBuffer: async () => wavBytes(1.5).buffer.slice(0) }
  }
  return { local, spawnImpl, fetchImpl, spawned, requests, ...overrides }
}

test('a voice id of the local model is recognised, a cloud id is not', () => {
  assert.equal(isLocalVoice('af_heart'), true)
  assert.equal(isLocalVoice('bf_emma'), true)
  assert.equal(isLocalVoice('local:am_michael'), true)
  assert.equal(isLocalVoice('English_expressive_narrator'), false)
  assert.equal(isLocalVoice(''), false)
  assert.equal(localVoiceFor('en-US'), DEFAULT_LOCAL_VOICES['en-US'])
  assert.equal(localVoiceFor('en-GB'), DEFAULT_LOCAL_VOICES['en-GB'])
})

test('without a voice named, the local model speaks first', async (t) => {
  const deps = localDeps()
  t.after(() => { /* the fake process has nothing to stop */ })
  const cloud = async () => { throw new Error('the cloud must not be asked') }
  const audio = await speak({ text: 'The brass lantern sat on the workbench.', accent: 'en-US' }, { ...deps, cloud })
  assert.equal(audio.provider, 'local')
  assert.equal(audio.voice, 'af_heart')
  assert.equal(audio.format, 'wav')
  assert.equal(audio.durationMs, 1500)
  assert.match(audio.url, /^data:audio\/wav;base64,/)
  // The local service was asked for exactly the text and the accent voice.
  const synth = deps.requests.find((request) => request.url.endsWith('/synthesize'))
  assert.equal(JSON.parse(synth.init.body).voice, 'af_heart')
})

test('British English asks the local model for its British voice', async () => {
  const deps = localDeps()
  const cloud = async () => { throw new Error('the cloud must not be asked') }
  const audio = await speak({ text: 'The brass lantern sat on the workbench.', accent: 'en-GB' }, { ...deps, cloud })
  assert.equal(audio.voice, 'bf_emma')
})

test('a local voice id wins over the accent default', async () => {
  const deps = localDeps()
  const cloud = async () => { throw new Error('the cloud must not be asked') }
  const audio = await speak({ text: 'Hello', accent: 'en-US', voiceId: 'am_michael' }, { ...deps, cloud })
  assert.equal(audio.voice, 'am_michael')
})

test('a cloud voice id goes straight to the cloud', async () => {
  const deps = localDeps()
  const asked = []
  const cloud = async (request) => {
    asked.push(request)
    return { url: 'data:audio/mp3;base64,AA', durationMs: 900, format: 'mp3' }
  }
  const audio = await speak({ text: 'Hello', voiceId: 'English_expressive_narrator' }, { ...deps, cloud })
  assert.equal(audio.provider, 'cloud')
  assert.equal(asked.length, 1)
  assert.equal(asked[0].voiceId, 'English_expressive_narrator')
  // Nothing local was started for a cloud voice.
  assert.equal(deps.spawned.length, 0)
})

test('the cloud takes over when the local model cannot answer', async () => {
  const deps = localDeps({
    fetchImpl: async (url) => {
      if (url.endsWith('/health')) return { ok: true, json: async () => ({ ok: true, voices: {} }) }
      return { ok: false, status: 500, text: async () => 'boom' }
    },
  })
  const asked = []
  const cloud = async (request) => {
    asked.push(request)
    return { url: 'data:audio/mp3;base64,AA', durationMs: 800, format: 'mp3' }
  }
  const audio = await speak({ text: 'Hello' }, { ...deps, cloud })
  assert.equal(audio.provider, 'cloud')
  // A local voice name means nothing to the cloud: it is not forwarded.
  assert.equal(asked[0].voiceId, undefined)
})

test('with the local model switched off, the cloud answers at once', async () => {
  const deps = localDeps()
  const asked = []
  const cloud = async (request) => {
    asked.push(request)
    return { url: 'data:audio/mp3;base64,AA', durationMs: 700, format: 'mp3' }
  }
  const audio = await speak({ text: 'Hello' }, { ...deps, cloud, localEnabled: false })
  assert.equal(audio.provider, 'cloud')
  assert.equal(asked.length, 1)
  assert.equal(deps.spawned.length, 0)
})

/**
 * The voice table decides what the reader sounds like. These tests exist
 * because a book was once read with a Japanese accent, and later with an
 * Indian one: the system default voice was used whenever no voice had been
 * picked, and the cloud voice list was taken as-is.
 */
import './dom-setup.mjs'
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ACCENTS,
  accentLang,
  cloudVoiceAccent,
  curateCloudVoices,
  isNoveltyVoice,
  normalizeAccent,
  normalizeLang,
  pickLocalVoice,
  rankLocalVoice,
} from '../src/lib/voices.js'
import { speakLocally } from '../src/lib/speech.js'

/** A machine that has a bit of everything installed, like a real Mac. */
const MACHINE = [
  { voiceURI: 'kyoko', name: 'Kyoko', lang: 'ja-JP', default: true },
  { voiceURI: 'aman', name: 'Aman', lang: 'en-IN' },
  { voiceURI: 'albert', name: 'Albert', lang: 'en-US' },
  { voiceURI: 'bubbles', name: 'Bubbles', lang: 'en-US' },
  { voiceURI: 'eddy', name: 'Eddy (English (US))', lang: 'en-US' },
  { voiceURI: 'samantha', name: 'Samantha', lang: 'en-US' },
  { voiceURI: 'daniel', name: 'Daniel (English (UK))', lang: 'en-GB' },
  { voiceURI: 'flo', name: 'Flo (English (UK))', lang: 'en-GB' },
  { voiceURI: 'serena', name: 'Serena', lang: 'en-GB' },
  { voiceURI: 'karen', name: 'Karen', lang: 'en-AU' },
]

test('the accent is normalised, and only the two offers exist', () => {
  assert.deepEqual(ACCENTS, ['en-US', 'en-GB'])
  assert.equal(normalizeAccent('en-GB'), 'en-GB')
  assert.equal(normalizeAccent('en-AU'), 'en-US')
  assert.equal(normalizeAccent(undefined), 'en-US')
  assert.equal(accentLang('en-GB'), 'en-GB')
  assert.equal(normalizeLang('en_US'), 'en-US')
  assert.equal(normalizeLang('EN-au'), 'en-AU')
  assert.equal(normalizeLang(''), '')
})

test('novelty voices are never used', () => {
  for (const name of ['Albert', 'Bad News', 'Bubbles', 'Zarvox', 'Grandma']) {
    assert.equal(isNoveltyVoice(name), true, name + ' is a novelty voice')
  }
  for (const name of ['Samantha', 'Daniel (English (UK))', 'Google US English']) {
    assert.equal(isNoveltyVoice(name), false, name + ' is a narrator')
  }
})

test('a voice of another accent is not a candidate', () => {
  // Infinity is "never": a foreign accent, a novelty voice, or no name at all.
  assert.equal(rankLocalVoice({ name: 'Aman', lang: 'en-IN' }, 'en-US'), Number.POSITIVE_INFINITY)
  assert.equal(rankLocalVoice({ name: 'Karen', lang: 'en-AU' }, 'en-US'), Number.POSITIVE_INFINITY)
  assert.equal(rankLocalVoice({ name: 'Kyoko', lang: 'ja-JP' }, 'en-US'), Number.POSITIVE_INFINITY)
  assert.ok(Number.isFinite(rankLocalVoice({ name: 'Samantha', lang: 'en-US' }, 'en-US')))
  assert.ok(Number.isFinite(rankLocalVoice({ name: 'Daniel', lang: 'en-GB' }, 'en-GB')))
})

test('the machine default voice is never the answer', () => {
  // Kyoko is marked default; an English sentence must not land on it.
  const picked = pickLocalVoice(MACHINE, 'en-US')
  assert.equal(picked.name, 'Samantha')
  const british = pickLocalVoice(MACHINE, 'en-GB')
  assert.equal(british.name, 'Daniel (English (UK))')
})

test('a downloaded enhanced or premium voice wins over the compact one', () => {
  const machine = [
    { voiceURI: 'samantha', name: 'Samantha', lang: 'en-US' },
    { voiceURI: 'samantha-enhanced', name: 'Samantha (Enhanced)', lang: 'en-US' },
    { voiceURI: 'daniel', name: 'Daniel', lang: 'en-GB' },
    { voiceURI: 'daniel-premium', name: 'Daniel (Premium)', lang: 'en-GB' },
  ]
  assert.match(pickLocalVoice(machine, 'en-US').name, /Samantha \(Enhanced\)/)
  assert.match(pickLocalVoice(machine, 'en-GB').name, /Daniel \(Premium\)/)
})

test('a narrator beat a system character voice', () => {
  assert.equal(pickLocalVoice(MACHINE, 'en-US').lang, 'en-US')
  const noSamantha = MACHINE.filter((voice) => voice.name !== 'Samantha')
  // Eddy is the next acceptable American voice, not Albert or Bubbles.
  assert.match(pickLocalVoice(noSamantha, 'en-US').name, /Eddy/)
})

test('no voice of the accent means the other accent, never a foreign voice', () => {
  const britishOnly = MACHINE.filter((voice) => !voice.name.startsWith('Samantha') && !voice.name.startsWith('Eddy'))
  const picked = pickLocalVoice(britishOnly, 'en-US')
  assert.equal(picked.name, 'Daniel (English (UK))')
  assert.equal(pickLocalVoice([{ name: 'Kyoko', lang: 'ja-JP' }], 'en-US'), null)
})

test('the cloud list is narration voices only, in the reader order', () => {
  const listed = [
    { id: 'English_expressive_narrator', lang: 'en-US' },
    { id: 'English_Trustworth_Man', lang: 'en-US' },
    { id: 'English_Aussie_Bloke', lang: 'en-AU' },
    { id: 'English_UpsetGirl', lang: 'en-US' },
    { id: 'Japanese_IntellectualSenior', lang: '' },
    { id: 'Chinese (Mandarin)_News_Anchor', lang: 'zh-CN' },
  ]
  const curated = curateCloudVoices(listed, 'en-US')
  assert.deepEqual(curated.map((voice) => voice.id), ['English_expressive_narrator', 'English_Trustworth_Man'])
  assert.equal(curated[0].lang, 'en-US')
  // British English stays on the machine's own British voice.
  assert.deepEqual(curateCloudVoices(listed, 'en-GB'), [])
  assert.equal(cloudVoiceAccent('English_expressive_narrator'), 'en-US')
  assert.equal(cloudVoiceAccent('English_Aussie_Bloke'), '')
})

test('a single word is read in the chosen accent as well', () => {
  const spoken = []
  const synth = {
    getVoices: () => MACHINE,
    speak: (utterance) => { spoken.push(utterance) },
  }
  const factory = (text) => ({ text, lang: '', voice: null, rate: 1 })
  assert.equal(speakLocally('lantern', { synth, utteranceFactory: factory, accent: 'en-US' }), true)
  assert.equal(spoken[0].lang, 'en-US')
  assert.equal(spoken[0].voice.voiceURI, 'samantha')

  assert.equal(speakLocally('lantern', { synth, utteranceFactory: factory, accent: 'en-GB' }), true)
  assert.equal(spoken[1].lang, 'en-GB')
  assert.equal(spoken[1].voice.voiceURI, 'daniel')
})

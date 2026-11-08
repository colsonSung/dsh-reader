import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSpeechFeedback } from '../src/lib/speech-feedback.js';

test('feedback: quiet, flat and incomplete reading gets three distinct suggestions', () => {
  const result = buildSpeechFeedback({
    analysis: { durationMs: 6000, rms: 0.006, loudnessVariation: 0.3, voicedFrames: 20, pitchRangeHz: 18, pauseRatio: 0.2 },
    spokenResult: { accuracy: 0.55, missing: 3, extra: 1 },
    transcript: 'a short reading',
  });
  assert.equal(result.voice.summaryKey, 'quiet');
  assert.equal(result.intonation.summaryKey, 'flat');
  assert.equal(result.pronunciation.summaryKey, 'repeatSlowly');
  assert.deepEqual(result.suggestions, ['quieterMic', 'markFocusWords', 'reviewMarkedWords']);
});

test('feedback: a clear complete reading is encouraging and pace is measured', () => {
  const result = buildSpeechFeedback({
    analysis: { durationMs: 6000, rms: 0.08, loudnessVariation: 0.3, voicedFrames: 30, pitchRangeHz: 70, pauseRatio: 0.2 },
    spokenResult: { accuracy: 0.94, missing: 0, extra: 0 },
    transcript: 'one two three four five six seven eight nine ten',
  });
  assert.equal(result.voice.tone, 'good');
  assert.equal(result.intonation.tone, 'good');
  assert.equal(result.pronunciation.tone, 'good');
  assert.equal(result.paceWpm, 100);
  assert.ok(result.suggestions.includes('keepAccuracy'));
});

test('feedback: missing acoustics never invent voice or intonation findings', () => {
  const result = buildSpeechFeedback({
    spokenResult: { accuracy: 0.8, missing: 1, extra: 0 },
    transcript: 'some words',
  });
  assert.equal(result.voice.tone, 'unknown');
  assert.equal(result.intonation.tone, 'unknown');
  assert.equal(result.pronunciation.tone, 'warn');
  assert.deepEqual(result.suggestions, ['reviewMarkedWords']);
});

test('feedback: impossible pace from a short clip is not displayed', () => {
  const result = buildSpeechFeedback({
    analysis: { durationMs: 1200, rms: 0.08, loudnessVariation: 0.3, voicedFrames: 12, pitchRangeHz: 70, pauseRatio: 0.2 },
    spokenResult: { accuracy: 1, missing: 0, extra: 0 },
    transcript: 'one two three four five six seven eight nine ten',
  });
  assert.equal(result.paceWpm, 0);
});

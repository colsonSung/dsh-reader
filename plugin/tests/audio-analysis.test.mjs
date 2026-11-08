import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzePcm, analyzeRecording } from '../src/lib/audio-analysis.js';

const SAMPLE_RATE = 16000;
const ZERO_RESULT = {
  durationMs: 0,
  rms: 0,
  loudnessVariation: 0,
  pauseRatio: 0,
  pitchMedianHz: 0,
  pitchRangeHz: 0,
  pitchVariation: 0,
  voicedFrames: 0,
};

function sine(seconds, frequency = 220, amplitude = 0.5, sampleRate = SAMPLE_RATE) {
  const length = Math.round(seconds * sampleRate);
  const samples = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    samples[index] = amplitude * Math.sin(2 * Math.PI * frequency * index / sampleRate);
  }
  return samples;
}

function join(...parts) {
  const result = new Float32Array(parts.reduce((length, part) => length + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function closeTo(actual, expected, tolerance) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} should be within ${tolerance} of ${expected}`);
}

test('empty PCM returns an all-zero result for typed and plain arrays', () => {
  assert.deepEqual(analyzePcm(new Float32Array()), ZERO_RESULT);
  assert.deepEqual(analyzePcm([]), ZERO_RESULT);
});

test('pure silence has zero energy and pitch, with every frame paused', () => {
  const result = analyzePcm(new Float32Array(SAMPLE_RATE));

  assert.equal(result.durationMs, 1000);
  assert.equal(result.rms, 0);
  assert.equal(result.loudnessVariation, 0);
  assert.equal(result.pauseRatio, 1);
  assert.equal(result.pitchMedianHz, 0);
  assert.equal(result.pitchRangeHz, 0);
  assert.equal(result.pitchVariation, 0);
  assert.equal(result.voicedFrames, 0);
});

test('a constant 220 Hz sine has a stable acoustic pitch estimate', () => {
  const result = analyzePcm(sine(1));

  assert.equal(result.durationMs, 1000);
  closeTo(result.rms, 0.5 / Math.sqrt(2), 0.001);
  assert.ok(result.loudnessVariation < 0.05);
  assert.ok(result.pauseRatio < 0.05);
  closeTo(result.pitchMedianHz, 220, 8);
  assert.ok(result.pitchRangeHz < 20);
  assert.ok(result.pitchVariation < 0.05);
  assert.ok(result.voicedFrames >= 45);
});

test('plain-array PCM and a non-default sample rate are supported', () => {
  const samples = Array.from(sine(0.5, 200, 0.25, 8000));
  const result = analyzePcm(samples, 8000);

  assert.equal(result.durationMs, 500);
  closeTo(result.rms, 0.25 / Math.sqrt(2), 0.001);
  closeTo(result.pitchMedianHz, 200, 10);
  assert.ok(result.voicedFrames > 15);
});

test('a clear level change raises RMS and frame loudness variation', () => {
  const quiet = sine(0.4, 220, 0.05);
  const loud = sine(0.4, 220, 0.5);
  const quietResult = analyzePcm(quiet);
  const loudResult = analyzePcm(loud);
  const combined = analyzePcm(join(quiet, loud));

  closeTo(loudResult.rms / quietResult.rms, 10, 0.05);
  assert.ok(quietResult.loudnessVariation < 0.05);
  assert.ok(loudResult.loudnessVariation < 0.05);
  assert.ok(combined.loudnessVariation > 0.5);
});

test('silent gaps produce a representative pause ratio and fewer voiced frames', () => {
  const tone = sine(0.5);
  const silence = new Float32Array(SAMPLE_RATE / 2);
  const result = analyzePcm(join(tone, silence, tone, silence));

  assert.equal(result.durationMs, 2000);
  assert.ok(result.pauseRatio >= 0.4 && result.pauseRatio <= 0.6, `pauseRatio was ${result.pauseRatio}`);
  assert.ok(result.voicedFrames >= 40 && result.voicedFrames <= 60);
  closeTo(result.pitchMedianHz, 220, 8);
});

test('unsupported recording analysis returns null without throwing', async () => {
  const blob = { arrayBuffer: async () => new ArrayBuffer(0) };
  assert.equal(await analyzeRecording(blob), null);
});

test('recording analysis decodes the first channel and closes the context', async () => {
  const firstChannel = sine(0.5);
  const bytes = new ArrayBuffer(8);
  let decodeCalls = 0;
  let closeCalls = 0;
  const context = {
    async decodeAudioData(buffer) {
      decodeCalls += 1;
      assert.equal(buffer, bytes);
      return {
        sampleRate: SAMPLE_RATE,
        getChannelData(channel) {
          return channel === 0 ? firstChannel : new Float32Array(firstChannel.length);
        },
      };
    },
    async close() {
      closeCalls += 1;
    },
  };

  const result = await analyzeRecording(
    { arrayBuffer: async () => bytes },
    { audioContextFactory: () => context },
  );

  assert.equal(decodeCalls, 1);
  assert.equal(closeCalls, 1);
  assert.equal(result.durationMs, 500);
  closeTo(result.pitchMedianHz, 220, 8);
  assert.ok(result.voicedFrames >= 20);
});

test('decode failure returns null and still closes the context', async () => {
  let closeCalls = 0;
  const context = {
    async decodeAudioData() {
      throw new Error('bad audio');
    },
    async close() {
      closeCalls += 1;
    },
  };

  const result = await analyzeRecording(
    { arrayBuffer: async () => new ArrayBuffer(8) },
    { audioContextFactory: () => context },
  );

  assert.equal(result, null);
  assert.equal(closeCalls, 1);
});

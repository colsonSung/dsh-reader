/**
 * Local acoustic estimates only; this is not phoneme or pronunciation scoring.
 */

const DEFAULT_SAMPLE_RATE = 16000;
const MIN_PITCH_HZ = 70;
const MAX_PITCH_HZ = 400;

function emptyResult() {
  return {
    durationMs: 0,
    rms: 0,
    loudnessVariation: 0,
    pauseRatio: 0,
    pitchMedianHz: 0,
    pitchRangeHz: 0,
    pitchVariation: 0,
    voicedFrames: 0,
  };
}

function positiveNumber(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function cleanSamples(samples) {
  const data = new Float32Array(samples.length);
  for (let index = 0; index < data.length; index += 1) {
    const value = Number(samples[index]);
    data[index] = Number.isFinite(value) ? value : 0;
  }
  return data;
}

function framePcm(data, sampleRate, frameMs, hopMs) {
  const frameSize = Math.max(1, Math.round(sampleRate * frameMs / 1000));
  const hopSize = Math.max(1, Math.round(sampleRate * hopMs / 1000));
  const frames = [];

  for (let start = 0; start < data.length; start += hopSize) {
    const end = Math.min(start + frameSize, data.length);
    let squares = 0;
    for (let index = start; index < end; index += 1) {
      squares += data[index] * data[index];
    }
    frames.push({ start, end, rms: Math.sqrt(squares / (end - start)) });
  }
  return frames;
}

function variation(values) {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mean <= 0) return 0;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

function adaptiveSilenceThreshold(frames, floor, noiseMultiplier) {
  const levels = frames.map((frame) => frame.rms).sort((a, b) => a - b);
  const noiseIndex = Math.floor((levels.length - 1) * 0.2);
  const noiseFloor = levels[noiseIndex];
  const peak = levels[levels.length - 1];

  // The peak cap keeps a steady audible tone above its own noise estimate.
  return Math.max(floor, Math.min(noiseFloor * noiseMultiplier, peak * 0.1));
}

function estimateFramePitch(data, frame, sampleRate, silenceThreshold, correlationThreshold) {
  if (frame.rms <= silenceThreshold) return 0;

  const length = frame.end - frame.start;
  const minLag = Math.max(1, Math.floor(sampleRate / MAX_PITCH_HZ));
  const maxLag = Math.min(length - 1, Math.ceil(sampleRate / MIN_PITCH_HZ));
  if (maxLag < minLag) return 0;

  const centered = new Float32Array(length);
  let mean = 0;
  for (let index = 0; index < length; index += 1) {
    mean += data[frame.start + index];
  }
  mean /= length;
  for (let index = 0; index < length; index += 1) {
    centered[index] = data[frame.start + index] - mean;
  }

  const correlations = new Float64Array(maxLag + 1);
  let bestLag = 0;
  let bestCorrelation = 0;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let products = 0;
    let energyA = 0;
    let energyB = 0;
    for (let index = 0; index < length - lag; index += 1) {
      const a = centered[index];
      const b = centered[index + lag];
      products += a * b;
      energyA += a * a;
      energyB += b * b;
    }
    const denominator = Math.sqrt(energyA * energyB);
    const correlation = denominator > 0 ? products / denominator : 0;
    correlations[lag] = correlation;
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestLag = lag;
    }
  }
  if (bestCorrelation < correlationThreshold) return 0;

  // Prefer the first strong period peak over a multiple of the same period.
  const strongEnough = Math.max(correlationThreshold, bestCorrelation - 0.1);
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    const correlation = correlations[lag];
    const leftOk = lag === minLag || correlation >= correlations[lag - 1];
    const rightOk = lag === maxLag || correlation >= correlations[lag + 1];
    if (correlation >= strongEnough && leftOk && rightOk) {
      bestLag = lag;
      break;
    }
  }
  return bestLag > 0 ? sampleRate / bestLag : 0;
}

function summarizePitch(pitches) {
  if (pitches.length === 0) {
    return { pitchMedianHz: 0, pitchRangeHz: 0, pitchVariation: 0, voicedFrames: 0 };
  }
  const sorted = [...pitches].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
  return {
    pitchMedianHz: median,
    pitchRangeHz: sorted[sorted.length - 1] - sorted[0],
    pitchVariation: variation(pitches),
    voicedFrames: pitches.length,
  };
}

/**
 * Estimate duration, energy, pauses and pitch from mono PCM samples.
 *
 * @param {Float32Array|number[]} samples
 * @param {number} [sampleRate]
 * @param {object} [options]
 * @param {number} [options.frameMs=40]
 * @param {number} [options.hopMs=20]
 * @param {number} [options.silenceFloor=0.0001]
 * @param {number} [options.noiseMultiplier=3]
 * @param {number} [options.silenceThreshold] - absolute override for adaptive silence detection
 * @param {number} [options.pitchCorrelationThreshold=0.6]
 */
export function analyzePcm(samples, sampleRate = DEFAULT_SAMPLE_RATE, options = {}) {
  if (!samples || typeof samples.length !== 'number' || samples.length === 0) return emptyResult();

  const rate = positiveNumber(sampleRate, DEFAULT_SAMPLE_RATE);
  const config = options && typeof options === 'object' ? options : {};
  const frameMs = positiveNumber(config.frameMs, 40);
  const hopMs = positiveNumber(config.hopMs, 20);
  const silenceFloor = Number.isFinite(config.silenceFloor) && config.silenceFloor >= 0
    ? config.silenceFloor
    : 0.0001;
  const noiseMultiplier = positiveNumber(config.noiseMultiplier, 3);
  const pitchCorrelationThreshold = positiveNumber(config.pitchCorrelationThreshold, 0.6);
  const data = cleanSamples(samples);

  let totalSquares = 0;
  for (let index = 0; index < data.length; index += 1) {
    totalSquares += data[index] * data[index];
  }

  const frames = framePcm(data, rate, frameMs, hopMs);
  const frameLevels = frames.map((frame) => frame.rms);
  const silenceThreshold = Number.isFinite(config.silenceThreshold) && config.silenceThreshold >= 0
    ? config.silenceThreshold
    : adaptiveSilenceThreshold(frames, silenceFloor, noiseMultiplier);
  const pausedFrames = frames.filter((frame) => frame.rms <= silenceThreshold).length;
  const pitches = [];

  for (const frame of frames) {
    const pitch = estimateFramePitch(data, frame, rate, silenceThreshold, pitchCorrelationThreshold);
    if (pitch > 0) pitches.push(pitch);
  }

  return {
    durationMs: data.length / rate * 1000,
    rms: Math.sqrt(totalSquares / data.length),
    loudnessVariation: variation(frameLevels),
    pauseRatio: pausedFrames / frames.length,
    ...summarizePitch(pitches),
  };
}

function decodeAudio(context, arrayBuffer) {
  return new Promise((resolve, reject) => {
    try {
      const result = context.decodeAudioData(arrayBuffer, resolve, reject);
      if (result && typeof result.then === 'function') result.then(resolve, reject);
      else if (result) resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

function defaultAudioContextFactory() {
  const AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
  return typeof AudioContextCtor === 'function' ? () => new AudioContextCtor() : null;
}

/**
 * Decode a recording and analyze its first channel. Failures are non-throwing.
 *
 * @param {Blob|{arrayBuffer: Function}} blob
 * @param {{audioContextFactory?: Function}} [deps]
 * @returns {Promise<object|null>}
 */
export async function analyzeRecording(blob, deps = {}) {
  let context = null;
  try {
    const factory = typeof deps?.audioContextFactory === 'function'
      ? deps.audioContextFactory
      : defaultAudioContextFactory();
    if (!factory || !blob || typeof blob.arrayBuffer !== 'function') return null;

    context = await factory();
    if (!context || typeof context.decodeAudioData !== 'function') return null;

    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await decodeAudio(context, arrayBuffer);
    if (!audioBuffer || typeof audioBuffer.getChannelData !== 'function') return null;

    const samples = audioBuffer.getChannelData(0);
    return analyzePcm(samples, positiveNumber(audioBuffer.sampleRate, DEFAULT_SAMPLE_RATE));
  } catch {
    return null;
  } finally {
    if (context && typeof context.close === 'function') {
      try {
        await context.close();
      } catch {
        // Closing is best-effort and must not surface an analysis error.
      }
    }
  }
}

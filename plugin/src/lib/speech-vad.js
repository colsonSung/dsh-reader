/**
 * End of speech: the learner should not have to press stop after reading a
 * sentence, and a red mark that only appears after a manual click is not
 * feedback — it is a report.
 *
 * The detector is deliberately plain: it watches the loudness of the microphone
 * and says "the voice has stopped" once the learner has spoken and then been
 * quiet for a while. No model, no streaming ASR: the transcription still
 * decides what was said, this only decides when to ask for it.
 */

/** Loudness (RMS, 0–1) above which the microphone hears a voice. */
export const SPEECH_RMS = 0.02;

/** How long the learner must have spoken before silence means "finished". */
export const MIN_SPEECH_MS = 900;

/** How long the quiet must last before the recording is closed. */
export const END_SILENCE_MS = 2000;

/**
 * @param {object} [options] - the thresholds and the callback.
 * @param {() => void} [options.onEnd] - called once, when the voice has stopped.
 * @param {number} [options.threshold] - RMS threshold.
 * @param {number} [options.minSpeechMs] - minimum speech before an end.
 * @param {number} [options.silenceMs] - quiet needed to call it an end.
 * @returns {{feed: (level: number, atMs: number) => 'quiet'|'speaking'|'ended', reset: () => void}}
 */
export function createSilenceWatcher(options = {}) {
  const onEnd = typeof options.onEnd === 'function' ? options.onEnd : null;
  const threshold = Number.isFinite(options.threshold) ? options.threshold : SPEECH_RMS;
  const minSpeechMs = Number.isFinite(options.minSpeechMs) ? options.minSpeechMs : MIN_SPEECH_MS;
  const silenceMs = Number.isFinite(options.silenceMs) ? options.silenceMs : END_SILENCE_MS;

  let speechMs = 0;
  let lastAt = 0;
  let quietSince = null;
  let ended = false;

  /** Forget everything: a new recording is a new sentence. */
  function reset() {
    speechMs = 0;
    lastAt = 0;
    quietSince = null;
    ended = false;
  }

  /**
   * Feed one loudness sample.
   *
   * @param {number} level - RMS, 0–1.
   * @param {number} atMs - the clock, in milliseconds.
   * @returns {'quiet'|'speaking'|'ended'} what the sample means.
   */
  function feed(level, atMs) {
    if (ended) return 'ended';
    const at = Number(atMs ?? 0);
    const step = lastAt === 0 ? 0 : Math.max(0, at - lastAt);
    lastAt = at;
    const value = Number(level ?? 0);
    if (value >= threshold) {
      quietSince = null;
      speechMs += step;
      return 'speaking';
    }
    if (quietSince === null) quietSince = at;
    // Silence only closes a reading that has actually started: a learner who is
    // still thinking about the first word must not have the microphone closed.
    if (speechMs >= minSpeechMs && at - quietSince >= silenceMs) {
      ended = true;
      if (onEnd !== null) onEnd();
      return 'ended';
    }
    return 'quiet';
  }

  return { feed, reset };
}

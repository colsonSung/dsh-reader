/**
 * Auto-next: reading aloud can run like a drill instead of a one-off take.
 *
 * When the switch is on and a sentence was read well enough, the reader moves
 * to the next sentence and starts recording it by itself; a sentence that was
 * not read well stays put, because that one still needs the learner.
 */

/** How well the sentence must have been read for the next one to start. */
export const AUTO_NEXT_MIN_ACCURACY = 0.8;

/** A short beat after the analysis, so the verdict is visible before moving. */
export const AUTO_NEXT_DELAY_MS = 650;

/**
 * Should the reader move on to the next sentence?
 *
 * @param {object} input - the state of the attempt.
 * @param {boolean} input.enabled - whether the auto-next switch is on.
 * @param {number} input.accuracy - the match of the reading, 0–1.
 * @param {boolean} input.hasNext - whether there is another sentence to read.
 * @param {number} [input.minAccuracy] - the bar to clear.
 * @returns {boolean} true when the next sentence should start by itself.
 */
export function shouldAdvance({ enabled, accuracy, hasNext, minAccuracy = AUTO_NEXT_MIN_ACCURACY } = {}) {
  if (enabled !== true) return false;
  if (hasNext !== true) return false;
  const value = Number(accuracy);
  if (!Number.isFinite(value)) return false;
  return value >= minAccuracy;
}

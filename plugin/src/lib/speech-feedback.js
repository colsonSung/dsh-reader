/**
 * Build evidence-based feedback for one read-aloud attempt.
 *
 * The acoustic values describe the recording; the word alignment describes
 * how much of the target text was recovered. Neither is presented as a
 * phoneme-level pronunciation score.
 */

/** Count words in a transcript without counting whitespace as speech. */
function wordCount(text) {
  const value = String(text ?? '').trim();
  return value === '' ? 0 : value.split(/\s+/).filter(Boolean).length;
}

/**
 * @param {{ analysis?: any, spokenResult?: any, transcript?: string }} input
 * @returns {{ voice: object, intonation: object, pronunciation: object, paceWpm: number, suggestions: string[] }}
 */
export function buildSpeechFeedback({ analysis = null, spokenResult = null, transcript = '' } = {}) {
  const durationMs = Number(analysis?.durationMs ?? 0);
  const measuredWpm = durationMs >= 1000
    ? Math.round(wordCount(transcript) / (durationMs / 60000))
    : 0;
  // A tiny clip or a transcription mismatch can produce impossible numbers.
  // Outside a generous human range the honest answer is "not measurable".
  const paceWpm = measuredWpm >= 30 && measuredWpm <= 240 ? measuredWpm : 0;

  let voice = { tone: 'unknown', summaryKey: 'unknown', suggestionKey: 'unavailable' };
  if (analysis !== null && durationMs > 0) {
    const rms = Number(analysis.rms ?? 0);
    const variation = Number(analysis.loudnessVariation ?? 0);
    if (rms < 0.012) {
      voice = { tone: 'warn', summaryKey: 'quiet', suggestionKey: 'quieterMic' };
    } else if (rms > 0.24) {
      voice = { tone: 'warn', summaryKey: 'loud', suggestionKey: 'stepBack' };
    } else if (variation > 0.85) {
      voice = { tone: 'warn', summaryKey: 'variable', suggestionKey: 'steadyVolume' };
    } else {
      voice = { tone: 'good', summaryKey: 'steady', suggestionKey: 'keepVolume' };
    }
  }

  let intonation = { tone: 'unknown', summaryKey: 'unknown', suggestionKey: 'unavailable' };
  if (analysis !== null && Number(analysis.voicedFrames ?? 0) >= 4) {
    const range = Number(analysis.pitchRangeHz ?? 0);
    const pauseRatio = Number(analysis.pauseRatio ?? 0);
    if (range < 28) {
      intonation = { tone: 'warn', summaryKey: 'flat', suggestionKey: 'markFocusWords' };
    } else if (range > 180) {
      intonation = { tone: 'warn', summaryKey: 'wide', suggestionKey: 'smallerPitchSteps' };
    } else if (pauseRatio > 0.58) {
      intonation = { tone: 'warn', summaryKey: 'choppy', suggestionKey: 'linkWords' };
    } else {
      intonation = { tone: 'good', summaryKey: 'natural', suggestionKey: 'keepIntonation' };
    }
  }

  const accuracy = Math.max(0, Math.min(1, Number(spokenResult?.accuracy ?? 0)));
  const missing = Math.max(0, Number(spokenResult?.missing ?? 0));
  const extra = Math.max(0, Number(spokenResult?.extra ?? 0));
  const pronunciation = {
    tone: accuracy >= 0.85 ? 'good' : accuracy >= 0.6 ? 'warn' : 'bad',
    summaryKey: accuracy >= 0.85 ? 'strongMatch' : accuracy >= 0.6 ? 'reviewWords' : 'repeatSlowly',
    suggestionKey: accuracy >= 0.85 ? 'keepAccuracy' : 'reviewMarkedWords',
    accuracy,
    missing,
    extra,
  };

  const suggestions = [
    voice.suggestionKey,
    intonation.suggestionKey,
    pronunciation.suggestionKey,
  ];
  if (paceWpm > 190) suggestions.push('slowDown');
  else if (paceWpm > 0 && paceWpm < 75) suggestions.push('keepMoving');
  // Keep only three distinct, actionable items so the card stays readable.
  return {
    voice,
    intonation,
    pronunciation,
    paceWpm,
    suggestions: [...new Set(suggestions.filter((key) => key !== 'unavailable'))].slice(0, 3),
  };
}

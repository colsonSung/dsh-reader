/**
 * Which voice reads the book, and in which accent.
 *
 * A reading app is only as good as its voice. Two things went wrong before this
 * module existed: the browser's default voice was used whenever no voice had
 * been picked (on a machine whose system voice is not American, an English
 * sentence came out with a Japanese or Indian accent), and the cloud voice list
 * was taken as-is, so a voice that speaks English as a second language could be
 * the one reading the book.
 *
 * This module is the single place that decides:
 *   - which accent the reader wants (American English, British English),
 *   - which local voices may speak it (a curated order, novelty voices never),
 *   - which cloud voices are narration voices (the provider mixes character
 *     voices into one list, and a reading app does not want "Upset Girl").
 *
 * Pure functions: no DOM, no React, no network.
 */

/** The accents the reader offers, in the order the UI shows them. */
export const ACCENTS = ['en-US', 'en-GB'];

/** The localised names of the accents, for the picker. */
export const ACCENT_LABELS = {
  'en-US': 'American English',
  'en-GB': 'British English',
};

/** The BCP 47 tag of an accent, defaulting to American English. */
export function normalizeAccent(accent) {
  return accent === 'en-GB' ? 'en-GB' : 'en-US';
}

/** The BCP 47 tag a speech API expects for an accent. */
export function accentLang(accent) {
  return normalizeAccent(accent);
}

/** `en_US` and `en-us` both mean `en-US`. */
export function normalizeLang(lang) {
  const value = String(lang ?? '').trim().replace(/_/g, '-').toLowerCase();
  if (value === '') return '';
  const [head, tail] = value.split('-');
  return tail === undefined ? head : `${head}-${tail.toUpperCase()}`;
}

/** The accent of a voice, when it is one the reader offers. */
export function accentOfLang(lang) {
  const normal = normalizeLang(lang);
  return ACCENTS.includes(normal) ? normal : '';
}

/**
 * The macOS / Windows / Chrome novelty voices. They are fun in a terminal and
 * wrong in a book: "Bubbles" reads English, but not the way a narrator does.
 */
const NOVELTY = new Set([
  'albert', 'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos', 'fred',
  'good news', 'jester', 'junior', 'kathy', 'organ', 'ralph', 'superstar',
  'trinoids', 'whisper', 'wobble', 'zarvox', 'grandma', 'grandpa', 'rocko',
]);

/**
 * The order a reader wants, per accent. The names are matched against the
 * beginning of a voice name; the list carries both the Apple names and the
 * Chrome / Windows ones, so no platform is left with the last resort.
 */
const PREFERRED = {
  'en-US': [
    'samantha', 'ava', 'allison', 'susan', 'tom', 'alex', 'zoe',
    'google us english', 'microsoft aria', 'microsoft guy', 'microsoft jenny',
    'microsoft andrew', 'siri', 'eddy', 'shelley', 'sandy', 'reed', 'flo',
  ],
  'en-GB': [
    'daniel', 'serena', 'kate', 'oliver', 'arthur', 'martha',
    'google uk english', 'microsoft libby', 'microsoft sonia', 'microsoft ryan',
    'eddy', 'shelley', 'sandy', 'reed', 'flo',
  ],
};

/** Whether a local voice name is one of the novelty voices. */
export function isNoveltyVoice(name) {
  const lower = String(name ?? '').toLowerCase();
  for (const word of NOVELTY) {
    if (lower === word || lower.startsWith(word + ' ')) return true;
  }
  return false;
}

/**
 * How good a local voice is for an accent. Lower is better; Infinity means it
 * must not be used at all (a foreign accent, a novelty voice, a nameless one).
 *
 * @param {{ name?: string, lang?: string }} voice
 * @param {string} accent
 * @returns {number}
 */
export function rankLocalVoice(voice, accent) {
  const name = String(voice?.name ?? '').toLowerCase();
  if (name === '') return Number.POSITIVE_INFINITY;
  if (isNoveltyVoice(name)) return Number.POSITIVE_INFINITY;
  const wanted = normalizeAccent(accent);
  const lang = normalizeLang(voice?.lang);
  if (accentOfLang(lang) !== wanted) return Number.POSITIVE_INFINITY;
  const list = PREFERRED[wanted] ?? [];
  const index = list.findIndex((prefix) => name.startsWith(prefix));
  // A downloaded "Enhanced" / "Premium" voice is the same narrator with a
  // better recording: it wins over the compact one of the same name.
  const quality = /enhanced|premium|natural/i.test(name) ? -0.5 : 0;
  return (index === -1 ? list.length + 1 : index) + quality;
}

/**
 * The voice that reads an accent on this machine.
 *
 * Strictly the requested accent first; if the machine has none of it, the other
 * accent the reader offers is still a narrator's English (never a novelty voice
 * and never whatever the system happens to default to). Anything that is not
 * English is refused: an English sentence read by a Japanese voice is exactly
 * the bug this exists to stop.
 *
 * @param {{ id: string, name: string, lang: string }[]} voices
 * @param {string} accent
 * @returns {{ id: string, name: string, lang: string }|null}
 */
export function pickLocalVoice(voices, accent) {
  const list = Array.isArray(voices) ? voices : [];
  const wanted = normalizeAccent(accent);
  const ranked = list
    .map((voice) => ({ voice, rank: rankLocalVoice(voice, wanted) }))
    .filter((entry) => Number.isFinite(entry.rank))
    .sort((a, b) => a.rank - b.rank);
  if (ranked.length > 0) return ranked[0].voice;
  const other = wanted === 'en-US' ? 'en-GB' : 'en-US';
  const fallback = list
    .map((voice) => ({ voice, rank: rankLocalVoice(voice, other) }))
    .filter((entry) => Number.isFinite(entry.rank))
    .sort((a, b) => a.rank - b.rank);
  return fallback.length > 0 ? fallback[0].voice : null;
}

/**
 * The cloud voices that can narrate a book, in the order a reader wants them.
 *
 * The provider lists every voice it sells side by side — narrator voices,
 * character voices, and voices that speak English with another language's
 * accent. A reading app takes the narrators only. The list is American English:
 * the provider does not tag a British accent, so British English stays on the
 * machine's own voice, which is a real British accent.
 */
export const CLOUD_NARRATORS = [
  { id: 'English_expressive_narrator', name: 'Expressive Narrator' },
  { id: 'English_Trustworth_Man', name: 'Trustworthy Man' },
  { id: 'English_CalmWoman', name: 'Calm Woman' },
  { id: 'English_WiseScholar', name: 'Wise Scholar' },
  { id: 'English_MaturePartner', name: 'Mature Partner' },
  { id: 'English_Steadymentor', name: 'Reliable Man' },
  { id: 'English_Deep-VoicedGentleman', name: 'Deep-voiced Gentleman' },
  { id: 'English_Graceful_Lady', name: 'Graceful Lady' },
];

/** The accents the cloud narrators speak. */
const CLOUD_ACCENT = 'en-US';

/**
 * The cloud voices worth offering for an accent.
 *
 * @param {{ id: string, name?: string, lang?: string }[]} voices - what the Host answered.
 * @param {string} accent
 * @returns {{ id: string, name: string, lang: string }[]}
 */
export function curateCloudVoices(voices, accent) {
  if (normalizeAccent(accent) !== CLOUD_ACCENT) return [];
  const available = new Map();
  for (const voice of Array.isArray(voices) ? voices : []) {
    const id = typeof voice?.id === 'string' ? voice.id : '';
    if (id === '') continue;
    available.set(id, voice);
  }
  return CLOUD_NARRATORS
    .filter((narrator) => available.has(narrator.id))
    .map((narrator) => ({
      id: narrator.id,
      name: narrator.name,
      lang: CLOUD_ACCENT,
    }));
}

/**
 * The accent a cloud voice speaks.
 *
 * @param {string} id
 * @returns {string} the accent, or '' when the voice is not a narrator.
 */
export function cloudVoiceAccent(id) {
  return CLOUD_NARRATORS.some((narrator) => narrator.id === id) ? CLOUD_ACCENT : '';
}

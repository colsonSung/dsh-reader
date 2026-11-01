/**
 * The languages the reader can translate into.
 *
 * The name is the language's own name: the model is told the name, and the
 * learner recognises it in the list without reading a translation of it. The
 * id is what the page and the Host exchange — the Host only accepts an id
 * from this list, so nothing the page sends can put words of its own into the
 * prompt.
 *
 * The page and the Host share this module: the page offers the list, the
 * Host refuses anything that is not in it.
 */

/** Every language the reader can translate into. */
export const TRANSLATION_LANGUAGES = Object.freeze([
  { id: 'zh', name: '中文' },
  { id: 'en', name: 'English' },
  { id: 'ja', name: '日本語' },
  { id: 'ko', name: '한국어' },
  { id: 'fr', name: 'Français' },
  { id: 'de', name: 'Deutsch' },
  { id: 'es', name: 'Español' },
  { id: 'pt', name: 'Português' },
  { id: 'it', name: 'Italiano' },
  { id: 'ru', name: 'Русский' },
]);

/** The language the reader falls back to. */
export const DEFAULT_TRANSLATION_LANGUAGE = 'zh';

/**
 * The language with that id.
 * @param {string} id - the id the page sent.
 * @returns {{ id: string, name: string } | null} the language, or null when
 *   the id is not one of ours.
 */
export function translationLanguage(id) {
  const wanted = String(id ?? '');
  return TRANSLATION_LANGUAGES.find((entry) => entry.id === wanted) ?? null;
}

/**
 * The name of the language to translate into.
 *
 * An unknown id is not an error: the reading goes on in the default language
 * rather than stopping over a setting.
 *
 * @param {string} id - the id the page sent.
 * @returns {string} the name of the language, in the language itself.
 */
export function translationLanguageName(id) {
  const language = translationLanguage(id);
  if (language !== null) return language.name;
  const fallback = translationLanguage(DEFAULT_TRANSLATION_LANGUAGE);
  return fallback === null ? '中文' : fallback.name;
}

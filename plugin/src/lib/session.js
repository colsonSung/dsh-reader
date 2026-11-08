/**
 * The last Reader screen, kept across mounts.
 *
 * The shell unmounts a plugin panel when the learner switches to another
 * plugin, so React state alone cannot bring the book back. This record holds
 * only the identity of the screen (which tab, which book); the reading
 * position itself lives in the book's own progress record.
 */

const KEY = 'reader:session';

/**
 * @param {{tab?: 'library'|'reader'|'vocab', bookId?: string|null}} value
 * @param {any} [storage] - injection seam for tests.
 * @returns {void}
 */
export function saveSession(value, storage = globalThis.localStorage) {
  try {
    if (!storage) return;
    const tab = value?.tab === 'reader' || value?.tab === 'vocab' ? value.tab : 'library';
    const bookId = typeof value?.bookId === 'string' && value.bookId !== '' ? value.bookId : null;
    if (bookId === null && tab === 'library') {
      storage.removeItem(KEY);
      return;
    }
    storage.setItem(KEY, JSON.stringify({ tab, bookId }));
  } catch {
    // A browser that refuses storage simply always starts at the library.
  }
}

/**
 * @param {any} [storage] - injection seam for tests.
 * @returns {{tab: 'library'|'reader'|'vocab', bookId: string|null}}
 */
export function loadSession(storage = globalThis.localStorage) {
  const empty = { tab: 'library', bookId: null };
  try {
    const raw = storage?.getItem(KEY);
    if (typeof raw !== 'string' || raw === '') return empty;
    const parsed = JSON.parse(raw);
    const tab = parsed?.tab === 'reader' || parsed?.tab === 'vocab' ? parsed.tab : 'library';
    const bookId = typeof parsed?.bookId === 'string' && parsed.bookId !== '' ? parsed.bookId : null;
    return { tab: bookId === null && tab === 'reader' ? 'library' : tab, bookId };
  } catch {
    return empty;
  }
}

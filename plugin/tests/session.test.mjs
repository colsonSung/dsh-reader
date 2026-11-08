import assert from 'node:assert/strict';
import test from 'node:test';

import { loadSession, saveSession } from '../src/lib/session.js';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
    size: () => map.size,
  };
}

test('session: the open book is remembered and restored', () => {
  const storage = memoryStorage();
  saveSession({ tab: 'reader', bookId: 'book-1' }, storage);
  assert.deepEqual(loadSession(storage), { tab: 'reader', bookId: 'book-1' });
});

test('session: returning to the library forgets the book', () => {
  const storage = memoryStorage();
  saveSession({ tab: 'reader', bookId: 'book-1' }, storage);
  saveSession({ tab: 'library', bookId: null }, storage);
  assert.equal(storage.size(), 0);
  assert.deepEqual(loadSession(storage), { tab: 'library', bookId: null });
});

test('session: the vocabulary tab is remembered without a book', () => {
  const storage = memoryStorage();
  saveSession({ tab: 'vocab', bookId: null }, storage);
  assert.deepEqual(loadSession(storage), { tab: 'vocab', bookId: null });
});

test('session: corrupt or foreign records fall back to the library', () => {
  const storage = memoryStorage();
  storage.setItem('reader:session', 'not json');
  assert.deepEqual(loadSession(storage), { tab: 'library', bookId: null });
  storage.setItem('reader:session', JSON.stringify({ tab: 'reader', bookId: '' }));
  assert.deepEqual(loadSession(storage), { tab: 'library', bookId: null });
  storage.setItem('reader:session', JSON.stringify({ tab: 'nope', bookId: 42 }));
  assert.deepEqual(loadSession(storage), { tab: 'library', bookId: null });
});

test('session: a storage that throws never breaks the panel', () => {
  const broken = {
    getItem: () => { throw new Error('denied'); },
    setItem: () => { throw new Error('denied'); },
    removeItem: () => { throw new Error('denied'); },
  };
  assert.doesNotThrow(() => saveSession({ tab: 'reader', bookId: 'x' }, broken));
  assert.deepEqual(loadSession(broken), { tab: 'library', bookId: null });
});

/**
 * The audio cache: the same paragraph is synthesised once and then reused.
 *
 * Node has no IndexedDB, so the browser's own database is faked here, the
 * same way `tests/store.test.mjs` fakes it: the fake opens the same
 * `english-reader` database, so the real store code runs, including the
 * upgrade from version 4 to version 5 and the new `audio` table.
 *
 * Run: node --test tests/tts-cache.test.mjs
 */
import assert from 'node:assert/strict';
import test from 'node:test';

const TTS_CACHE_URL = new URL('../src/lib/tts-cache.js', import.meta.url).href;
const LOCAL_STORE_URL = new URL('../src/lib/local-store.js', import.meta.url).href;

/** The counter that gives every fresh copy of a module its own identity. */
let version = 0;

/**
 * Load a fresh copy of a module, so the memory it keeps starts empty.
 * @param {string} url - the module URL.
 * @returns {Promise<object>} the module.
 */
function loadModule(url) {
  version += 1;
  return import(`${url}?v=${version}`);
}

/**
 * A fake IndexedDB: just enough of it for the browser's own shelf.
 * @returns {object} the fake, with `indexedDB`, `seed`, `records`, `ops`, ...
 */
function createFakeIndexedDb() {
  const databases = new Map();
  const ops = { open: 0, get: 0, getAll: 0, put: 0, delete: 0, clear: 0 };
  let broken = false;

  /**
   * A request that answers a tick later, like the real one.
   * @param {Function} compute - what the request does.
   * @returns {object} the request.
   */
  function makeRequest(compute) {
    const request = { onsuccess: null, onerror: null, result: undefined, error: null };
    queueMicrotask(() => {
      try {
        request.result = compute();
        request.onsuccess?.();
      } catch (error) {
        request.error = error;
        request.onerror?.();
      }
    });
    return request;
  }

  /**
   * The object store of one table.
   * @param {object} store - the table.
   * @returns {object} the object store.
   */
  function objectStoreOf(store) {
    return {
      getAll: () => { ops.getAll += 1; return makeRequest(() => [...store.records.values()]); },
      get: (key) => { ops.get += 1; return makeRequest(() => store.records.get(key)); },
      put: (value) => {
        ops.put += 1;
        return makeRequest(() => {
          store.records.set(value[store.keyPath], value);
          return value[store.keyPath];
        });
      },
      delete: (key) => {
        ops.delete += 1;
        return makeRequest(() => {
          store.records.delete(key);
          return undefined;
        });
      },
      clear: () => { ops.clear += 1; return makeRequest(() => { store.records.clear(); return undefined; }); },
      createIndex: () => ({}),
    };
  }

  /**
   * The database of one name; it is created the first time it is opened.
   * @param {string} name - the database name.
   * @returns {object} the database.
   */
  function databaseOf(name) {
    let database = databases.get(name);
    if (database === undefined) {
      database = { name, version: 0, stores: new Map() };
      databases.set(name, database);
    }
    return database;
  }

  const indexedDB = {
    open(name, wanted) {
      ops.open += 1;
      const request = {
        onsuccess: null, onerror: null, onupgradeneeded: null, onblocked: null,
        result: null, error: null,
      };
      queueMicrotask(() => {
        const database = databaseOf(name);
        request.result = {
          objectStoreNames: { contains: (storeName) => database.stores.has(storeName) },
          createObjectStore: (storeName, options = {}) => {
            const store = { keyPath: options.keyPath ?? null, records: new Map() };
            database.stores.set(storeName, store);
            return { createIndex: () => ({}) };
          },
          transaction: () => {
            if (broken) throw new Error('数据库打不开');
            return {
              objectStore: (storeName) => {
                const store = database.stores.get(storeName);
                if (store === undefined) throw new Error(`没有这个表：${storeName}`);
                return objectStoreOf(store);
              },
            };
          },
          close: () => {},
        };
        if (wanted > database.version) {
          database.version = wanted;
          request.onupgradeneeded?.();
        }
        request.onsuccess?.();
      });
      return request;
    },
  };

  /** The key path of every table of the shelf. */
  const KEY_PATHS = {
    books: 'id',
    vocabulary: 'id',
    notes: 'id',
    podcasts: 'id',
    audio: 'key',
  };

  return {
    indexedDB,
    ops,
    /**
     * Put a record into a table, as if it had been saved earlier.
     * @param {string} storeName - the table.
     * @param {object} record - the record.
     * @returns {void}
     */
    seed(storeName, record) {
      const database = databaseOf('english-reader');
      let store = database.stores.get(storeName);
      if (store === undefined) {
        store = { keyPath: KEY_PATHS[storeName] ?? 'id', records: new Map() };
        database.stores.set(storeName, store);
      }
      store.records.set(record[store.keyPath], { ...record });
    },
    /**
     * Every record of a table.
     * @param {string} storeName - the table.
     * @returns {object[]} the records.
     */
    records(storeName) {
      const store = databaseOf('english-reader').stores.get(storeName);
      return store === undefined ? [] : [...store.records.values()];
    },
    /**
     * Whether a table is there.
     * @param {string} storeName - the table.
     * @returns {boolean} true when the table exists.
     */
    hasStore(storeName) {
      return databaseOf('english-reader').stores.has(storeName);
    },
    /**
     * The version of the database.
     * @returns {number} the version.
     */
    version() {
      return databaseOf('english-reader').version;
    },
    /**
     * Empty every table, between two cases.
     * @returns {void}
     */
    reset() {
      databases.get('english-reader')?.stores.forEach((store) => store.records.clear());
    },
    /**
     * Make every transaction fail, as a blocked upgrade does.
     * @returns {void}
     */
    break() {
      broken = true;
    },
    /**
     * Let the transactions work again.
     * @returns {void}
     */
    fix() {
      broken = false;
    },
  };
}

const indexed = createFakeIndexedDb();
globalThis.indexedDB = indexed.indexedDB;

/**
 * Open the fake database at one version, as an old build would have.
 * @param {object} fake - the fake database.
 * @param {number} wanted - the version.
 * @returns {Promise<void>} resolves when the database is open.
 */
function openVersion(fake, wanted) {
  return new Promise((resolve) => {
    const request = fake.indexedDB.open('english-reader', wanted);
    request.onsuccess = () => { resolve(); };
  });
}

test('版本 4 的书库升到 5 时建起 audio 表，旧表与旧数据不动', async () => {
  const upgrade = createFakeIndexedDb();
  const previous = globalThis.indexedDB;
  globalThis.indexedDB = upgrade.indexedDB;
  try {
    // 一个版本 4 的书库：四个旧表，几条旧数据。
    await openVersion(upgrade, 4);
    upgrade.seed('books', { id: 'bk_1', title: '旧书', addedAt: 1, chapters: [] });
    upgrade.seed('notes', { id: 'nt_1', bookId: 'bk_1', text: '旧笔记', createdAt: 1, updatedAt: 1 });
    assert.equal(upgrade.version(), 4);
    assert.equal(upgrade.hasStore('audio'), false);

    const localStore = await loadModule(LOCAL_STORE_URL);
    const books = await localStore.listBooks();
    const notes = await localStore.listNotes();

    assert.equal(books.length, 1, '旧书不能丢');
    assert.equal(books[0].title, '旧书');
    assert.equal(notes.length, 1, '旧笔记不能丢');
    assert.equal(upgrade.version(), 5, '书库要升到 5');
    assert.equal(upgrade.hasStore('audio'), true, 'audio 表必须建起来');
    assert.equal(upgrade.hasStore('books'), true);
    assert.equal(upgrade.hasStore('vocabulary'), true);
    assert.equal(upgrade.hasStore('notes'), true);
    assert.equal(upgrade.hasStore('podcasts'), true);
    assert.deepEqual(await localStore.listAudio(), [], '新表一开始是空的');

    // 新表能写、能读、也能删。
    const record = {
      key: 'au_1', source: 'v|1|t', url: 'data:audio/mp3;base64,AA',
      durationMs: 10, createdAt: 1, bytes: 2,
    };
    await localStore.saveAudio(record);
    assert.equal(upgrade.records('audio').length, 1);
    assert.equal((await localStore.getAudio('au_1')).url, record.url);
    await localStore.deleteAudio('au_1');
    assert.equal(upgrade.records('audio').length, 0);
  } finally {
    globalThis.indexedDB = previous;
  }
});

test('audioKey：同样的文字、音色与语速给同一个键', async () => {
  const cache = await loadModule(TTS_CACHE_URL);
  const first = cache.audioKey({ text: 'Hello there.', voiceId: 'mm:voice', rate: 1 });
  const again = cache.audioKey({ text: 'Hello there.', voiceId: 'mm:voice', rate: 1 });

  assert.equal(first, again, '同样的输入必须是同一个键');
  assert.notEqual(first, cache.audioKey({ text: 'Hello there.', voiceId: 'mm:other', rate: 1 }), '音色不同就是另一段');
  assert.notEqual(first, cache.audioKey({ text: 'Hello there.', voiceId: 'mm:voice', rate: 1.5 }), '语速不同就是另一段');
  assert.notEqual(first, cache.audioKey({ text: 'Hello world.', voiceId: 'mm:voice', rate: 1 }), '文字不同就是另一段');
});

test('audioKey：键是短的哈希，不是整段文字', async () => {
  const cache = await loadModule(TTS_CACHE_URL);
  const text = 'A paragraph that is long enough to be worth hashing. '.repeat(20);
  const key = cache.audioKey({ text, voiceId: 'mm:voice', rate: 1 });

  assert.ok(key.length < 40, `键必须短，却有 ${key.length} 个字符`);
  assert.ok(key.length < text.length, '键不能比正文还长');
  assert.equal(key.includes('paragraph'), false, '键里不能带着正文');
});

test('speakCached：第一次去问宿主，第二次直接用缓存', async () => {
  indexed.reset();
  const cache = await loadModule(TTS_CACHE_URL);
  let asked = 0;
  const ask = async (request) => {
    asked += 1;
    assert.equal(request.text, 'Hello there.');
    assert.equal(request.voiceId, 'mm:voice');
    assert.equal(request.rate, 1);
    return { url: 'data:audio/mp3;base64,AAAA', durationMs: 1200 };
  };

  const first = await cache.speakCached('Hello there.', { voiceId: 'mm:voice', rate: 1, ask });
  assert.equal(asked, 1);
  assert.equal(first.cached, false, '第一次是现做的');
  assert.equal(first.url, 'data:audio/mp3;base64,AAAA');
  assert.equal(first.durationMs, 1200);

  const second = await cache.speakCached('Hello there.', { voiceId: 'mm:voice', rate: 1, ask });
  assert.equal(asked, 1, '命中缓存就不能再问宿主');
  assert.equal(second.cached, true, '第二次是缓存里的');
  assert.equal(second.url, first.url);
  assert.equal(second.durationMs, 1200);

  // 片段存进了表里，键就是那把键。
  const stored = indexed.records('audio');
  assert.equal(stored.length, 1);
  assert.equal(stored[0].key, cache.audioKey({ text: 'Hello there.', voiceId: 'mm:voice', rate: 1 }));
  assert.equal(stored[0].source, 'mm:voice|1|Hello there.');
  assert.equal(stored[0].url, 'data:audio/mp3;base64,AAAA');
  assert.equal(stored[0].bytes, 'data:audio/mp3;base64,AAAA'.length);
  assert.ok(stored[0].createdAt > 0);
});

test('speakCached：第二次点播放连数据库都不用碰', async () => {
  indexed.reset();
  const cache = await loadModule(TTS_CACHE_URL);
  let asked = 0;
  const ask = async () => {
    asked += 1;
    return { url: 'data:audio/mp3;base64,AAAA', durationMs: 10 };
  };

  await cache.speakCached('Instant.', { voiceId: 'v', rate: 1, ask });
  const before = { get: indexed.ops.get, getAll: indexed.ops.getAll, put: indexed.ops.put };
  await cache.speakCached('Instant.', { voiceId: 'v', rate: 1, ask });

  assert.equal(asked, 1);
  assert.equal(indexed.ops.get, before.get, '第二次不能去读表');
  assert.equal(indexed.ops.getAll, before.getAll, '第二次不能去翻整张表');
  assert.equal(indexed.ops.put, before.put, '第二次不能去写表');
});

test('speakCached：两次同时点，只合成一次', async () => {
  indexed.reset();
  const cache = await loadModule(TTS_CACHE_URL);
  let asked = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const ask = async () => {
    asked += 1;
    await gate;
    return { url: 'data:audio/mp3;base64,BBBB', durationMs: 900 };
  };

  const first = cache.speakCached('Same text.', { voiceId: 'v', rate: 1, ask });
  const second = cache.speakCached('Same text.', { voiceId: 'v', rate: 1, ask });
  release();
  const [a, b] = await Promise.all([first, second]);

  assert.equal(asked, 1, '两次点击只能合成一次');
  assert.equal(a.url, b.url);
  assert.equal(a.durationMs, b.durationMs);
  assert.equal(indexed.records('audio').length, 1, '表里也只有一段');
});

test('speakCached：换了音色或语速就是另一段', async () => {
  indexed.reset();
  const cache = await loadModule(TTS_CACHE_URL);
  let asked = 0;
  const ask = async (request) => {
    asked += 1;
    return { url: `data:audio/mp3;base64,${request.voiceId}-${request.rate}` };
  };

  const voice = await cache.speakCached('Word.', { voiceId: 'v1', rate: 1, ask });
  const other = await cache.speakCached('Word.', { voiceId: 'v2', rate: 1, ask });
  const slower = await cache.speakCached('Word.', { voiceId: 'v1', rate: 1.5, ask });

  assert.equal(asked, 3, '换音色或语速都要再合成');
  assert.notEqual(voice.url, other.url);
  assert.notEqual(voice.url, slower.url);
  assert.equal(indexed.records('audio').length, 3);
});

test('warmAudio：合成失败也不算失败', async () => {
  indexed.reset();
  const cache = await loadModule(TTS_CACHE_URL);
  let asked = 0;
  const ask = async () => {
    asked += 1;
    throw new Error('宿主不通');
  };

  await cache.warmAudio('Broken.', { voiceId: 'v', rate: 1, ask });
  assert.equal(asked, 1);

  // 预热失败的那一段，到要用的时候再合成一次。
  await assert.rejects(
    () => cache.speakCached('Broken.', { voiceId: 'v', rate: 1, ask }),
    /宿主不通/,
  );
  assert.equal(asked, 2);
});

test('缓存满了：最旧的一段被丢掉，最新的一段还在', async () => {
  indexed.reset();
  const cache = await loadModule(TTS_CACHE_URL);
  const oldUrl = 'data:audio/mp3;base64,AAAA';
  const newUrl = 'data:audio/mp3;base64,BBBB';
  let asked = 0;
  const ask = async (request) => {
    asked += 1;
    return { url: request.text === 'old' ? oldUrl : newUrl };
  };

  // 四十个字节的预算只放得下一段。
  await cache.speakCached('old', { voiceId: 'v', rate: 1, ask, budgetBytes: 40 });
  await new Promise((resolve) => { setTimeout(resolve, 2); });
  await cache.speakCached('new', { voiceId: 'v', rate: 1, ask, budgetBytes: 40 });

  const stored = indexed.records('audio');
  assert.equal(stored.length, 1, '装不下就只留一段');
  assert.equal(stored[0].url, newUrl, '最新的一段留着');
  assert.equal(asked, 2);

  // 被丢掉的那一段连记忆里的也没有了：再要它，就得再合成。
  const again = await cache.speakCached('old', { voiceId: 'v', rate: 1, ask, budgetBytes: 40 });
  assert.equal(asked, 3, '丢掉的那一段要重新合成');
  assert.equal(again.cached, false);
});

test('缓存里的片段：来源对不上的旧片段会被重新合成并盖掉', async () => {
  indexed.reset();
  const cache = await loadModule(TTS_CACHE_URL);
  const key = cache.audioKey({ text: 'Same.', voiceId: 'v', rate: 1 });
  // 表里存着一段来源对不上的片段：键一样，文字却不是这一段。
  indexed.seed('audio', {
    key,
    source: 'v|1|别的文字',
    url: 'data:audio/mp3;base64,OLD',
    durationMs: 1,
    createdAt: 1,
    bytes: 3,
  });

  let asked = 0;
  const ask = async () => {
    asked += 1;
    return { url: 'data:audio/mp3;base64,NEW', durationMs: 2 };
  };
  const clip = await cache.speakCached('Same.', { voiceId: 'v', rate: 1, ask });

  assert.equal(asked, 1, '来源对不上就是没缓存过');
  assert.equal(clip.cached, false);
  assert.equal(clip.url, 'data:audio/mp3;base64,NEW');
  const stored = indexed.records('audio');
  assert.equal(stored.length, 1);
  assert.equal(stored[0].url, 'data:audio/mp3;base64,NEW', '旧的那段要被盖掉');
  assert.equal(stored[0].source, 'v|1|Same.');
});

test('表里的片段：重新打开页面也能直接用', async () => {
  indexed.reset();
  const cache = await loadModule(TTS_CACHE_URL);
  const key = cache.audioKey({ text: 'From the store.', voiceId: 'v', rate: 1 });
  const url = 'data:audio/mp3;base64,STORED';
  indexed.seed('audio', {
    key,
    source: 'v|1|From the store.',
    url,
    durationMs: 700,
    createdAt: 1,
    bytes: url.length,
  });

  let asked = 0;
  const ask = async () => {
    asked += 1;
    return { url: 'data:audio/mp3;base64,NEW' };
  };
  const clip = await cache.speakCached('From the store.', { voiceId: 'v', rate: 1, ask });

  assert.equal(asked, 0, '表里有的片段不能再问宿主');
  assert.equal(clip.cached, true);
  assert.equal(clip.url, url);
  assert.equal(clip.durationMs, 700);
});

test('clearAudioCache：表里空了，记忆里的也一起忘了', async () => {
  indexed.reset();
  const cache = await loadModule(TTS_CACHE_URL);
  let asked = 0;
  const ask = async () => {
    asked += 1;
    return { url: 'data:audio/mp3;base64,CCCC' };
  };

  await cache.speakCached('Forget me.', { voiceId: 'v', rate: 1, ask });
  assert.equal(asked, 1);
  assert.equal(indexed.records('audio').length, 1);

  await cache.clearAudioCache();
  assert.equal(indexed.records('audio').length, 0, '表里要空');

  const again = await cache.speakCached('Forget me.', { voiceId: 'v', rate: 1, ask });
  assert.equal(asked, 2, '忘了就要再合成');
  assert.equal(again.cached, false);
});

test('audioCacheUsage：报告片段数与字节数', async () => {
  indexed.reset();
  const cache = await loadModule(TTS_CACHE_URL);
  const url = 'data:audio/mp3;base64,AAAA';
  const ask = async () => ({ url, durationMs: 100 });

  await cache.speakCached('One.', { voiceId: 'v', rate: 1, ask });
  await cache.speakCached('Two.', { voiceId: 'v', rate: 1, ask });
  const usage = await cache.audioCacheUsage();

  assert.equal(usage.clips, 2);
  assert.equal(usage.bytes, url.length * 2);

  await cache.clearAudioCache();
  const empty = await cache.audioCacheUsage();
  assert.deepEqual(empty, { clips: 0, bytes: 0 });
});

test('数据库不可用时朗读不受影响：宿主照常被问，第二遍从记忆里拿', async () => {
  indexed.reset();
  const cache = await loadModule(TTS_CACHE_URL);
  let asked = 0;
  const ask = async () => {
    asked += 1;
    return { url: 'data:audio/mp3;base64,FFFF', durationMs: 10 };
  };

  indexed.break();
  try {
    const first = await cache.speakCached('Broken store.', { voiceId: 'v', rate: 1, ask });
    assert.equal(first.url, 'data:audio/mp3;base64,FFFF', '存储坏了也要出声');
    assert.equal(first.cached, false);
    assert.equal(asked, 1);

    const second = await cache.speakCached('Broken store.', { voiceId: 'v', rate: 1, ask });
    assert.equal(asked, 1, '第二遍从这一页的记忆里拿');
    assert.equal(second.cached, true);
    assert.equal(second.url, first.url);
  } finally {
    indexed.fix();
  }
});

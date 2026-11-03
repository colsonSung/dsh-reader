/**
 * Chunk contract tests.
 *
 * The PDF support is a sibling chunk: `client.pdf.js` is a separate file next
 * to `client.js`, and the shell's client-module loader fetches it on demand
 * through `require.async('./client.pdf.js')`. The loader resolves that
 * specifier against the package's own bundle URL and serves the file from
 * `/plugins/<package>/<file>?rev=<rev>`, and it only accepts a chunk that
 * registers itself with the package id and the chunk's file name.
 *
 * These tests pin that contract, so a rename or a rebuild that breaks it fails
 * here instead of degrading to "PDF 暂不可用" in the app.
 *
 * Run: node --test tests/chunk.test.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import { parsePdf } from '../src/lib/parsers/pdf.js';
import { loadChunk } from '../src/lib/chunks.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

/** The loader accepts only `client.<name>.js` as a package-local chunk. */
const CLIENT_CHUNK = /^client\.[A-Za-z0-9][A-Za-z0-9._-]*\.js$/;

/**
 * Run a built bundle against a stub of the shell's module loader and return
 * the registration it made.
 * @param {string} file - bundle file name
 * @returns {{ id: string, chunk?: string, factory: Function }}
 */
function registrationOf(file) {
  const registrations = [];
  const window = {
    __ModuleLoader__: {
      load(registration) { registrations.push(registration); },
    },
  };
  const context = vm.createContext({ window, console, setTimeout, clearTimeout, URL, Blob });
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
  assert.equal(registrations.length, 1, `${file} must register exactly one factory`);
  return registrations[0];
}

test('the chunk file sits next to the entry bundle', () => {
  // The Host serves a package-local chunk from the entry bundle's own
  // directory, so the two files have to share one folder.
  assert.ok(fs.existsSync(path.join(ROOT, 'client.js')), 'client.js is missing');
  assert.ok(fs.existsSync(path.join(ROOT, 'client.pdf.js')), 'client.pdf.js is missing');
  assert.ok(PACKAGE.files.includes('client.pdf.js'), 'package.json must ship client.pdf.js');
});

test('the chunk registers itself the way the loader expects', () => {
  const registration = registrationOf('client.pdf.js');
  assert.equal(registration.id, PACKAGE.name, 'the chunk must belong to the package');
  assert.equal(registration.chunk, 'client.pdf.js', 'the chunk must name its own file');
  assert.ok(CLIENT_CHUNK.test(registration.chunk), 'the loader only accepts client.<name>.js');
  assert.equal(typeof registration.factory, 'function');
});

test('the entry bundle registers the same package id', () => {
  // The loader derives the chunk owner from this id, so the two registrations
  // have to name the same package.
  const registration = registrationOf('client.js');
  assert.equal(registration.id, PACKAGE.name);
  assert.equal(registration.chunk, undefined, 'the entry bundle is not a chunk');
});

test('the parser asks for the chunk by its exact relative name', async () => {
  const requested = [];
  await assert.rejects(
    parsePdf(new Uint8Array([1, 2, 3]), {
      loadChunk: async (chunkPath) => {
        requested.push(chunkPath);
        throw new Error('boom');
      },
    }),
    (error) => {
      // The reason has to survive: a chunk that cannot be fetched and a broken
      // loader look identical when the cause is swallowed.
      assert.match(error.message, /boom/);
      return true;
    },
  );
  assert.deepEqual(requested, ['./client.pdf.js']);
});

test('the chunk loader reports why a chunk failed', async () => {
  // The loader hands the plugin a `require` with an async operation; the
  // plugin asks it for `./client.pdf.js` and gets the chunk's exports back.
  const previous = globalThis.require;
  /** The shell's require is a function that also carries the async operation. */
  const loaderWith = (operation) => Object.assign(() => {}, { async: operation });
  try {
    globalThis.require = loaderWith(async (chunkPath) => ({ chunkPath, default: { getDocument() {} } }));
    const chunk = await loadChunk('./client.pdf.js');
    assert.equal(chunk.getDocument instanceof Function, true);

    globalThis.require = loaderWith(async () => { throw new Error('404 Not Found'); });
    await assert.rejects(loadChunk('./client.pdf.js'), /404 Not Found/);

    globalThis.require = loaderWith(async () => new Promise(() => {}));
    await assert.rejects(loadChunk('./client.pdf.js', 20), /did not load/);
  } finally {
    if (previous === undefined) delete globalThis.require;
    else globalThis.require = previous;
  }
});

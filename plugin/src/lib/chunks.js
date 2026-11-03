/**
 * Lazy chunk loading.
 *
 * The browser bundle is loaded by the shell's module loader, which also offers
 * an async `require` for chunks that are fetched on demand. A chunk that never
 * arrives must reject instead of hanging the caller.
 *
 * The shell resolves `./client.<name>.js` against the package's own bundle URL
 * and serves it from `/plugins/<package>/<file>?rev=<rev>`; the chunk
 * registers itself with `chunk: "<file>"`. The request therefore has to name
 * the sibling file exactly as it is named on disk.
 *
 * @param {string} path - chunk path relative to this module, e.g. './client.pdf.js'
 * @param {number} [timeoutMs] - how long to wait before giving up
 * @returns {Promise<any>} the chunk's exports
 */
export async function loadChunk(path, timeoutMs = 20000) {
  // `require` is the shell's module-loader require; esbuild leaves the
  // identifier alone because the bundle is wrapped in the loader factory.
  const loader = typeof require === 'function' ? require : undefined;
  if (loader === undefined || typeof loader.async !== 'function') {
    throw new Error(`chunk loader is unavailable for ${path}`);
  }
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => { reject(new Error(`chunk ${path} did not load`)); }, timeoutMs);
  });
  // A chunk that fails after the timeout must not surface as an unhandled
  // rejection: the timeout already told the caller what happened. The race
  // still sees the real failure when it comes first.
  const loading = loader.async(path);
  loading.catch(() => {});
  try {
    const chunk = await Promise.race([loading, timeout]);
    return chunk?.default ?? chunk;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

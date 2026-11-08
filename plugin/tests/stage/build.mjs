/**
 * Build the standalone reader stage.
 *
 * Bundles `stage-entry.js` (which imports the real plugin sources) into one
 * classic script — file:// pages cannot load ES modules, and this keeps Chrome
 * from needing a local server — and writes the page that hosts it.
 *
 * Two variants exist, because the bug this stage is evidence for lives in one
 * line of `reader/src/ui/reader.js`:
 *
 *   current  the working tree as it is (default)          out/stage.html + stage.js
 *   before   the same tree with the player bar rendered    out/stage-before.html
 *            in every mode again — the state the bug was  + stage-before.js
 *            observed in (one control surface per mode is
 *            what fixes it)
 *
 * The before variant is produced by a build-time text substitution inside
 * esbuild: the plugin sources on disk are never modified. If the line the
 * substitution looks for is gone, the build fails instead of quietly
 * labelling a screenshot with the wrong variant.
 *
 * Run: node tests/stage/build.mjs [--variant current|before]
 */
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, 'out');
const readerRoot = resolve(here, '../..');

const variantIndex = process.argv.indexOf('--variant');
const variant = variantIndex === -1 ? 'current' : process.argv[variantIndex + 1];
if (variant !== 'current' && variant !== 'before') {
  throw new Error('unknown --variant ' + String(variant) + ' (expected current or before)');
}
const fileSuffix = variant === 'before' ? '-before' : '';

/*
 * The host tokens the plugin reads but does not own. The real application
 * hands these in; a standalone page has to approximate them. The values below
 * are the light reading theme: warm paper canvas, near-black ink, brass focus.
 */
const HOST_TOKENS = [
  ':root{',
  '  color-scheme: light;',
  '  --dsw-alias-bg-base: #FBFAF8;',
  '  --dsw-alias-bg-layer-1: #FFFFFF;',
  '  --dsw-alias-bg-layer-2: #F4F1EA;',
  '  --dsw-alias-label-primary: #23211E;',
  '  --dsw-focus-ring-color: #8A6A3B;',
  '  --dsw-focus-ring-width: 2px;',
  '  --dsw-radius-xs: 4px;',
  '  --dsw-radius-sm: 6px;',
  '  --dsw-radius-md: 10px;',
  '  --dsw-radius-lg: 14px;',
  '  --dsw-radius-xl: 20px;',
  "  --dsw-font: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', 'PingFang SC', sans-serif;",
  '}',
].join('\n');

const PAGE_CSS = [
  'html, body { margin: 0; padding: 0; height: 100%; }',
  'body { background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font-family: var(--dsw-font); overflow: hidden; }',
  '#root { height: 100%; }',
  '/* The reader root the container queries measure against. */',
  '.stage-page { height: 100%; width: 100%; }',
  '/* Phone comparison: a 390px page. Run it with a 390px window so the',
  '   viewport media queries agree with the container width. */',
  '.stage-page.is-phone { width: 390px; height: 100%; margin: 0 auto; box-shadow: 0 0 0 1px rgba(35, 33, 30, 0.12); }',
].join('\n');

/*
 * Headless Chrome under --virtual-time-budget never fires
 * requestAnimationFrame (verified with a minimal page: only timers advance),
 * yet React and the reader's measuring effects schedule work on rAF. The stage
 * gives the page a timer-backed rAF before the bundle loads, so those effects
 * still run and the probe measures a settled layout.
 */
const RAF_SHIM = [
  '<script>',
  '(function () {',
  '  var next = 0;',
  '  var timers = new Map();',
  '  window.requestAnimationFrame = function (callback) {',
  '    var id = ++next;',
  '    var timer = setTimeout(function () { timers.delete(id); callback(performance.now()); }, 16);',
  '    timers.set(id, timer);',
  '    return id;',
  '  };',
  '  window.cancelAnimationFrame = function (id) {',
  '    var timer = timers.get(id);',
  '    if (timer !== undefined) clearTimeout(timer);',
  '    timers.delete(id);',
  '  };',
  '})();',
  '<' + '/script>',
].join('\n');

/**
 * Replace the single-control-surface line with the pre-fix unconditional
 * player bar, without touching the file on disk.
 * @returns {object} an esbuild plugin
 */
function beforeVariantPlugin() {
  const fixedLine = "mode === 'listen' ? renderFoot() : null,";
  return {
    name: 'reader-before-variant',
    setup(builder) {
      builder.onLoad({ filter: /src[\\/]ui[\\/]reader\.js$/ }, async (args) => {
        const source = await readFile(args.path, 'utf8');
        if (!source.includes(fixedLine)) {
          throw new Error(
            'before variant: the renderFoot guard is gone from ' + args.path
            + ' — update beforeVariantPlugin in tests/stage/build.mjs',
          );
        }
        return { contents: source.replace(fixedLine, 'renderFoot(),'), loader: 'js' };
      });
    },
  };
}

/**
 * Fingerprint the plugin sources the stage renders, so a probe can be tied to
 * the exact code it measured even while the working tree is being edited.
 * @param {string} relativePath
 * @returns {Promise<{path: string, mtime: string, sha256: string}>}
 */
async function fingerprint(relativePath) {
  const absolute = resolve(readerRoot, relativePath);
  const [source, sourceStat] = await Promise.all([readFile(absolute, 'utf8'), stat(absolute)]);
  return {
    path: 'reader/' + relativePath,
    mtime: new Date(sourceStat.mtimeMs).toISOString(),
    sha256: createHash('sha256').update(source).digest('hex').slice(0, 16),
  };
}

const meta = {
  variant,
  buildStamp: new Date().toISOString(),
  sources: [
    await fingerprint('src/ui/reader.js'),
    await fingerprint('src/ui/styles.js'),
    await fingerprint('src/client-entry.js'),
  ],
};
const metaScript = '<script>window.__STAGE_META__ = '
  + JSON.stringify(meta).replace(/</g, '\\u003c')
  + ';</script>';

const html = [
  '<!doctype html>',
  '<html lang="en">',
  '<head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<title>Reader Stage</title>',
  '<style>',
  HOST_TOKENS,
  PAGE_CSS,
  '</style>',
  '</head>',
  '<body>',
  '<div id="root"></div>',
  metaScript,
  RAF_SHIM,
  '<script src="stage' + fileSuffix + '.js"></script>',
  '</body>',
  '</html>',
  '',
].join('\n');

await mkdir(outDir, { recursive: true });

await build({
  entryPoints: [resolve(here, 'stage-entry.js')],
  outfile: resolve(outDir, 'stage' + fileSuffix + '.js'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome110'],
  logLevel: 'info',
  sourcemap: false,
  // pdf.js reads import.meta.url only in its Node.js branches; the reader's
  // own build disables it the same way.
  supported: { 'import-meta': false },
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: variant === 'before' ? [beforeVariantPlugin()] : [],
  banner: { js: '/* Reader stage bundle — built by tests/stage/build.mjs. Do not edit. */' },
});

await writeFile(resolve(outDir, 'stage' + fileSuffix + '.html'), html, 'utf8');

console.log('stage built (' + variant + '): ' + resolve(outDir, 'stage' + fileSuffix + '.html'));
console.log('stage built (' + variant + '): ' + resolve(outDir, 'stage' + fileSuffix + '.js'));
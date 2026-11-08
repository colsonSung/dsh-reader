/**
 * Run the reader stage in headless Chrome.
 *
 * For each variant (current / before) and each practice mode it takes one
 * screenshot and one --dump-dom pass, reads the JSON probe out of the dumped
 * page, and prints the geometry facts the bug is about. PNGs are decoded here
 * so a blank render is caught instead of being reported as success.
 *
 * Run: node tests/stage/run.mjs [options]
 *
 *   --modes listen,type,speak   modes to capture (default: all three)
 *   --variant current|before|both  which build to render (default: both)
 *   --size 1440x900             Chrome window size (default: 1440x900)
 *   --phone                     render the 390x844 phone comparison instead
 *   --modes-open                pin the practice panel open for the shot
 *   --skip-build                use the bundles already in out/
 *   --chrome <path>             Chrome binary (default: Google Chrome on macOS)
 */
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inflateSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, 'out');
const DEFAULT_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEFAULT_MODES = ['listen', 'type', 'speak'];

/* --------------------------------------------------------------------- args */

/**
 * @param {string[]} argv
 * @returns {{modes: string[], variants: string[], width: number, height: number, phone: boolean, skipBuild: boolean, chrome: string}}
 */
function parseArgs(argv) {
  const options = {
    modes: DEFAULT_MODES.slice(),
    variants: ['current', 'before'],
    width: 1440,
    height: 900,
    phone: false,
    modesOpen: false,
    skipBuild: false,
    chrome: process.env.CHROME_PATH ?? DEFAULT_CHROME,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--modes') {
      options.modes = String(argv[++i] ?? '').split(',').map((value) => value.trim()).filter(Boolean);
    } else if (arg === '--variant') {
      const value = String(argv[++i] ?? 'both');
      options.variants = value === 'both' ? ['current', 'before'] : [value];
    } else if (arg === '--size') {
      const [width, height] = String(argv[++i] ?? '').split('x').map(Number);
      options.width = width;
      options.height = height;
    } else if (arg === '--phone') {
      options.phone = true;
    } else if (arg === '--modes-open') {
      options.modesOpen = true;
    } else if (arg === '--skip-build') {
      options.skipBuild = true;
    } else if (arg === '--chrome') {
      options.chrome = String(argv[++i] ?? options.chrome);
    } else {
      throw new Error('unknown argument: ' + arg);
    }
  }
  if (options.modes.some((mode) => !['listen', 'type', 'speak'].includes(mode))) {
    throw new Error('--modes expects listen, type, speak');
  }
  if (options.variants.some((variant) => !['current', 'before'].includes(variant))) {
    throw new Error('--variant expects current, before or both');
  }
  if (options.phone) {
    options.width = 390;
    options.height = 844;
  }
  return options;
}

/* ------------------------------------------------------------------ process */

/**
 * @param {string} command
 * @param {string[]} args
 * @param {number} timeoutMs
 * @returns {Promise<{code: number, stdout: string, stderr: string}>}
 */
function run(command, args, timeoutMs = 90000) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(command + ' timed out after ' + timeoutMs + 'ms'));
    }, timeoutMs);
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolvePromise({ code, stdout, stderr });
    });
  });
}

/* -------------------------------------------------------------------- build */

/**
 * @param {string} variant
 * @returns {Promise<void>}
 */
async function buildStage(variant) {
  const result = await run(process.execPath, [resolve(here, 'build.mjs'), '--variant', variant], 120000);
  process.stdout.write(result.stdout);
  if (result.code !== 0) {
    throw new Error('build failed for ' + variant + ': ' + result.stderr.trim());
  }
}

/* ------------------------------------------------------------------- chrome */

/**
 * @param {string} profile
 * @param {{width: number, height: number}} size
 * @returns {string[]}
 */
function chromeFlags(profile, size) {
  return [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--mute-audio',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--window-size=' + size.width + ',' + size.height,
    '--virtual-time-budget=6000',
    '--user-data-dir=' + profile,
  ];
}

/* -------------------------------------------------------------------- probe */

/**
 * @param {string} text
 * @returns {string}
 */
function decodeEntities(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Read the probe JSON out of a --dump-dom page.
 * @param {string} html
 * @returns {object|null}
 */
function extractProbe(html) {
  const match = /<pre id="probe"[^>]*>([\s\S]*?)<\/pre>/.exec(html);
  if (match === null) return null;
  return JSON.parse(decodeEntities(match[1]));
}

/* ---------------------------------------------------------------------- png */

/**
 * @param {Buffer} buffer
 * @returns {{width: number, height: number, supported: boolean, inkRatio?: number}}
 */
function inspectPng(buffer) {
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') {
    return { width: 0, height: 0, supported: false };
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  let position = 8;
  let bitDepth = 0;
  let colorType = 0;
  const chunks = [];
  while (position + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(position);
    const type = buffer.toString('ascii', position + 4, position + 8);
    const data = buffer.subarray(position + 8, position + 8 + length);
    if (type === 'IHDR') {
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      chunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
    position += 12 + length;
  }
  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2) || chunks.length === 0) {
    return { width, height, supported: false };
  }
  const channels = colorType === 6 ? 4 : 3;
  let raw;
  try {
    raw = inflateSync(Buffer.concat(chunks));
  } catch (error) {
    return { width, height, supported: false };
  }
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);
  let offset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[offset];
    offset += 1;
    const row = raw.subarray(offset, offset + stride);
    offset += stride;
    const current = pixels.subarray(y * stride, (y + 1) * stride);
    const previous = y === 0 ? null : pixels.subarray((y - 1) * stride, y * stride);
    for (let x = 0; x < stride; x += 1) {
      const a = x >= channels ? current[x - channels] : 0;
      const b = previous === null ? 0 : previous[x];
      const c = previous !== null && x >= channels ? previous[x - channels] : 0;
      let value = row[x];
      if (filter === 1) value = (value + a) & 255;
      else if (filter === 2) value = (value + b) & 255;
      else if (filter === 3) value = (value + ((a + b) >> 1)) & 255;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        value = (value + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
      current[x] = value;
    }
  }
  // A blank render is one flat colour. Quantise to a 12-level grid per
  // channel, find the modal colour (the page), and report how much of the
  // image is something else — text, panels, the dock, the bars.
  const histogram = new Map();
  let sampled = 0;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const index = y * stride + x * channels;
      const key = ((pixels[index] >> 4) << 8) | ((pixels[index + 1] >> 4) << 4) | (pixels[index + 2] >> 4);
      histogram.set(key, (histogram.get(key) ?? 0) + 1);
      sampled += 1;
    }
  }
  let modal = 0;
  for (const count of histogram.values()) {
    if (count > modal) modal = count;
  }
  return {
    width,
    height,
    supported: true,
    // Share of pixels that are not the page colour. A blank render is ~0.
    inkRatio: sampled === 0 ? 0 : Math.round(((sampled - modal) / sampled) * 10000) / 10000,
    colours: histogram.size,
  };
}

/* --------------------------------------------------------------------- main */

/**
 * @param {string} mode
 * @param {string} variant
 * @param {object} options
 * @param {string} profile
 * @returns {Promise<object>}
 */
async function capture(mode, variant, options, profile) {
  const suffix = (options.phone ? '-phone' : '') + (variant === 'before' ? '-before' : '');
  const htmlName = 'stage' + (variant === 'before' ? '-before' : '') + '.html';
  const htmlPath = resolve(outDir, htmlName);
  const imageName = 'shot-' + mode + suffix + '.png';
  const probeName = 'probe-' + mode + suffix + '.json';
  const imagePath = resolve(outDir, imageName);
  const probePath = resolve(outDir, probeName);
  const url = pathToFileURL(htmlPath).href + '?mode=' + mode + (options.phone ? '&phone=1' : '')
    + (options.modesOpen ? '&modes=1&notrans=1' : '');
  const size = { width: options.width, height: options.height };

  const screenshot = await run(options.chrome, [
    ...chromeFlags(profile, size),
    '--screenshot=' + imagePath,
    url,
  ]);
  if (screenshot.code !== 0) {
    throw new Error('screenshot failed for ' + mode + ' (' + variant + '): ' + screenshot.stderr.trim().slice(-800));
  }
  const image = await readFile(imagePath);
  const png = inspectPng(image);
  if (!png.supported) {
    throw new Error('could not decode ' + imageName + ' (' + image.length + ' bytes)');
  }
  if (png.width === 0 || png.height === 0) {
    throw new Error(imageName + ' has no pixels');
  }

  const dump = await run(options.chrome, [...chromeFlags(profile, size), '--dump-dom', url]);
  if (dump.code !== 0) {
    throw new Error('dump-dom failed for ' + mode + ' (' + variant + '): ' + dump.stderr.trim().slice(-800));
  }
  const probe = extractProbe(dump.stdout);
  if (probe === null) {
    const debugPath = resolve(outDir, 'dom-' + mode + suffix + '.html');
    await writeFile(debugPath, dump.stdout, 'utf8');
    throw new Error('no <pre id="probe"> in the dumped DOM for ' + mode + ' (' + variant + '); wrote ' + debugPath);
  }
  probe.image = { file: imageName, width: png.width, height: png.height, bytes: image.length, inkRatio: png.inkRatio ?? null };
  await writeFile(probePath, JSON.stringify(probe, null, 2) + '\n', 'utf8');
  return { mode, variant, imageName, probeName, probe };
}

/**
 * One line per capture, with the facts the bug is about.
 * @param {object} result
 * @returns {string}
 */
function summaryLine(result) {
  const probe = result.probe;
  const image = probe.image;
  const bars = probe.visibleBars ?? [];
  const foot = probe.footButtons ?? [];
  return [
    '[' + result.variant + '/' + result.mode + ']',
    'visibleBars=' + JSON.stringify(bars),
    'paperCovered=' + String(probe.paperCovered),
    'coveredArea=' + String(probe.paperCoveredArea),
    'footButtons=' + JSON.stringify(foot),
    'image=' + image.width + 'x' + image.height,
    'ink=' + (image.inkRatio === null ? 'n/a' : (image.inkRatio * 100).toFixed(1) + '%'),
    'errors=' + JSON.stringify(probe.consoleErrors ?? []),
  ].join(' ');
}

/**
 * @returns {Promise<void>}
 */
async function main() {
  const options = parseArgs(process.argv.slice(2));
  await mkdir(outDir, { recursive: true });
  if (!options.skipBuild) {
    for (const variant of options.variants) {
      await buildStage(variant);
    }
  }
  const profileRoot = await mkdtemp(resolve(tmpdir(), 'reader-stage-'));
  const results = [];
  for (const variant of options.variants) {
    for (const mode of options.modes) {
      const result = await capture(mode, variant, options, profileRoot);
      results.push(result);
      console.log(summaryLine(result));
    }
  }
  console.log('');
  console.log('captured ' + results.length + ' set(s) into ' + outDir);
  const problems = results.filter((result) => (result.probe.consoleErrors ?? []).length > 0);
  if (problems.length > 0) {
    console.log('console errors: ' + problems.map((result) => result.variant + '/' + result.mode).join(', '));
    process.exitCode = 1;
  }
}

await main();

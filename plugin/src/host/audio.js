/**
 * Audio conversion for the Host ASR route.
 *
 * Browsers normally record WebM. MiniMax accepts WAV (and several other
 * formats) but not matroska/webm, so the Host converts once, to the small
 * PCM format speech models expect: 16 kHz, mono, 16-bit.
 */

import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** WAV files already have the RIFF/WAVE pair and need no conversion. */
export function isWav(bytes) {
  return Buffer.isBuffer(bytes) && bytes.length >= 12
    && bytes.toString('ascii', 0, 4) === 'RIFF'
    && bytes.toString('ascii', 8, 12) === 'WAVE';
}

/**
 * @param {Buffer} inputBytes - encoded recording bytes
 * @param {{ filename?: string, timeoutMs?: number }} [options]
 * @returns {Promise<{bytes: Buffer, filename: string}>}
 */
export async function convertAudioToWav(inputBytes, options = {}) {
  const bytes = Buffer.isBuffer(inputBytes) ? inputBytes : Buffer.from(inputBytes ?? []);
  if (bytes.length === 0) throw new Error('没有可转换的音频');
  if (isWav(bytes)) return { bytes, filename: 'recording.wav' };

  const directory = await mkdtemp(join(tmpdir(), 'reader-audio-'));
  const input = join(directory, 'input.audio');
  const output = join(directory, 'recording.wav');
  try {
    await writeFile(input, bytes);
    await execFileAsync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-i', input,
      '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le',
      output,
    ], { timeout: options.timeoutMs ?? 20000, maxBuffer: 1024 * 1024 });
    return { bytes: await readFile(output), filename: 'recording.wav' };
  } finally {
    await rm(directory, { recursive: true, force: true }).catch(() => {});
  }
}

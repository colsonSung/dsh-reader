import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { convertAudioToWav, isWav } from '../src/host/audio.js';

function ffmpegAvailable() {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

test('audio: RIFF/WAVE is recognized and passed through without conversion', async () => {
  const wav = Buffer.alloc(44);
  wav.write('RIFF', 0, 'ascii');
  wav.write('WAVE', 8, 'ascii');
  assert.equal(isWav(wav), true);
  assert.equal(isWav(Buffer.from('not audio')), false);
  const result = await convertAudioToWav(wav);
  assert.equal(result.bytes, wav);
  assert.equal(result.filename, 'recording.wav');
});

test('audio: WebM is converted to 16 kHz mono PCM WAV', { skip: !ffmpegAvailable() }, async () => {
  const directory = mkdtempSync(join(tmpdir(), 'reader-audio-test-'));
  const webm = join(directory, 'input.webm');
  execFileSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'sine=frequency=220:duration=0.2',
    '-c:a', 'libopus', webm,
  ]);
  const result = await convertAudioToWav(readFileSync(webm));
  assert.equal(isWav(result.bytes), true);
  assert.equal(result.bytes.readUInt16LE(22), 1, 'mono');
  assert.equal(result.bytes.readUInt32LE(24), 16000, 'sample rate');
});

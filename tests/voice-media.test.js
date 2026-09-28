import { expect, mock, test } from 'bun:test';
import { readFile } from 'node:fs/promises';

mock.module('server-only', () => ({}));
const { inspectVoiceMedia } = await import('../src/lib/voiceMedia');
const { SEED_VOICES } = await import('../src/lib/seed/generate');

test('voice duration and type come from decoded media', async () => {
  const clip = await readFile(
    new URL('./fixtures/voice-short.webm', import.meta.url),
  );
  expect(await inspectVoiceMedia(clip)).toEqual({
    mimeType: 'audio/webm',
    durationSeconds: 1,
  });
});

test('voice validation rejects non-audio and recordings over twenty seconds', async () => {
  await expect(inspectVoiceMedia(Buffer.from('not audio'))).rejects.toThrow();
  const clip = await readFile(
    new URL('./fixtures/voice-long.webm', import.meta.url),
  );
  await expect(inspectVoiceMedia(clip)).rejects.toThrow();
});

test('dummy voice clips are valid intros with the durations the seeder records', async () => {
  for (const { file, seconds } of SEED_VOICES) {
    const clip = await readFile(
      new URL(`../src/lib/seed/voices/${file}`, import.meta.url),
    );
    expect(await inspectVoiceMedia(clip)).toEqual({
      mimeType: 'audio/webm',
      durationSeconds: seconds,
    });
  }
});

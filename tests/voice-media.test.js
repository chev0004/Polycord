import { expect, mock, test } from 'bun:test';
import { readFile } from 'node:fs/promises';

mock.module('server-only', () => ({}));
const { inspectVoiceMedia } = await import('../src/lib/voiceMedia');

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

import { expect, mock, test } from 'bun:test';
import { readFile } from 'node:fs/promises';

mock.module('server-only', () => ({}));
const { inspectVoiceMedia } = await import('../src/lib/voiceMedia');
const { SEED_VOICES } = await import('../src/lib/seed/generate');

const fixture = (name) =>
  readFile(new URL(`./fixtures/${name}.webm`, import.meta.url));

test('voice duration and type come from decoded media', async () => {
  expect(await inspectVoiceMedia(await fixture('voice-short'), 8)).toEqual({
    mimeType: 'audio/webm',
    durationSeconds: 1,
  });
});

test('voice validation accepts each plan limit and rejects longer recordings', async () => {
  await expect(
    inspectVoiceMedia(Buffer.from('not audio'), 20),
  ).rejects.toThrow();
  expect(await inspectVoiceMedia(await fixture('voice-8s'), 8)).toEqual({
    mimeType: 'audio/webm',
    durationSeconds: 8,
  });
  await expect(
    inspectVoiceMedia(await fixture('voice-8s-over'), 8),
  ).rejects.toThrow();
  expect(await inspectVoiceMedia(await fixture('voice-9s'), 20)).toEqual({
    mimeType: 'audio/webm',
    durationSeconds: 9,
  });
  expect(await inspectVoiceMedia(await fixture('voice-20s'), 20)).toEqual({
    mimeType: 'audio/webm',
    durationSeconds: 20,
  });
  await expect(
    inspectVoiceMedia(await fixture('voice-long'), 20),
  ).rejects.toThrow();
});

test('dummy voice clips are valid intros with the durations the seeder records', async () => {
  for (const { file, seconds } of SEED_VOICES) {
    const clip = await readFile(
      new URL(`../src/lib/seed/voices/${file}`, import.meta.url),
    );
    expect(await inspectVoiceMedia(clip, 20)).toEqual({
      mimeType: 'audio/webm',
      durationSeconds: seconds,
    });
  }
});

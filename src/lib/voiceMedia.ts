import 'server-only';

import { execFile } from 'node:child_process';
import { mkdtemp, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { path as ffprobePath } from 'ffprobe-static';

export const inspectVoiceMedia = async (bytes: Buffer, maxSeconds: number) => {
  const directory = await mkdtemp(join(tmpdir(), 'polycord-voice-'));
  const file = join(directory, 'clip');
  try {
    await writeFile(file, bytes);
    const { stdout } = await promisify(execFile)(
      ffprobePath,
      [
        '-v',
        'error',
        '-protocol_whitelist',
        'file',
        '-show_entries',
        'format=format_name:stream=codec_type,sample_rate:frame=nb_samples',
        '-show_frames',
        '-of',
        'json',
        file,
      ],
      { timeout: 10000, maxBuffer: 4 * 1024 * 1024, windowsHide: true },
    );
    const media = JSON.parse(stdout) as {
      format?: { format_name?: string };
      streams?: { codec_type?: string; sample_rate?: string }[];
      frames?: { nb_samples?: number }[];
    };
    const formats = media.format?.format_name?.split(',') ?? [];
    const mimeType = formats.includes('webm')
      ? 'audio/webm'
      : formats.includes('ogg')
        ? 'audio/ogg'
        : formats.includes('mp4')
          ? 'audio/mp4'
          : formats.includes('mp3')
            ? 'audio/mpeg'
            : null;
    const sampleRate = Number(media.streams?.[0]?.sample_rate);
    const samples = (media.frames ?? []).reduce(
      (total, frame) => total + (frame.nb_samples ?? Number.NaN),
      0,
    );
    const duration = samples / sampleRate;
    if (
      !mimeType ||
      media.streams?.length !== 1 ||
      media.streams[0].codec_type !== 'audio' ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      duration > maxSeconds
    ) {
      throw new Error('Invalid voice media');
    }
    return {
      mimeType,
      durationSeconds: Math.max(1, Math.round(duration)),
    };
  } finally {
    await unlink(file).catch(() => {});
    await rmdir(directory);
  }
};

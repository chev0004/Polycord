import 'server-only';

import { execFile } from 'node:child_process';
import { mkdtemp, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { path as ffprobePath } from 'ffprobe-static';

export const inspectVoiceMedia = async (bytes: Buffer) => {
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
        'format=format_name:stream=codec_type:frame=nb_samples,sample_rate,pkt_duration_time',
        '-show_frames',
        '-of',
        'json',
        file,
      ],
      { timeout: 10000, maxBuffer: 4 * 1024 * 1024, windowsHide: true },
    );
    const media = JSON.parse(stdout) as {
      format?: { format_name?: string };
      streams?: { codec_type?: string }[];
      frames?: {
        nb_samples?: number;
        sample_rate?: string;
        pkt_duration_time?: string;
      }[];
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
    const duration = (media.frames ?? []).reduce(
      (seconds, frame) =>
        seconds +
        (frame.sample_rate && frame.nb_samples
          ? frame.nb_samples / Number(frame.sample_rate)
          : Number(frame.pkt_duration_time ?? 0)),
      0,
    );
    if (
      !mimeType ||
      media.streams?.length !== 1 ||
      media.streams[0].codec_type !== 'audio' ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      duration > 20.1
    ) {
      throw new Error('Invalid voice media');
    }
    return {
      mimeType,
      durationSeconds: Math.max(1, Math.min(20, Math.round(duration))),
    };
  } finally {
    await unlink(file).catch(() => {});
    await rmdir(directory);
  }
};

import 'server-only';

import { probeMedia } from './probeMedia';

export const inspectVoiceMedia = async (bytes: Buffer, maxSeconds: number) => {
  const media = (await probeMedia(bytes, [
    '-show_entries',
    'format=format_name:stream=codec_type,sample_rate:frame=nb_samples',
    '-show_frames',
  ])) as {
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
};

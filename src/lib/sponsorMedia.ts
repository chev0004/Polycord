import 'server-only';

import {
  SPONSOR_IMAGE_SIZES,
  type SponsorImageSlot,
} from '@/constants/sponsors';
import { probeMedia } from './probeMedia';

const IMAGE_TYPES = new Map([
  ['png', 'image/png'],
  ['mjpeg', 'image/jpeg'],
  ['webp', 'image/webp'],
]);

export const inspectSponsorImage = async (
  bytes: Buffer,
  slot: SponsorImageSlot,
) => {
  const { streams = [] } = (await probeMedia(bytes, [
    '-show_entries',
    'stream=codec_name,width,height',
  ])) as {
    streams?: { codec_name?: string; width?: number; height?: number }[];
  };
  const [stream] = streams;
  const mimeType = IMAGE_TYPES.get(stream?.codec_name ?? '');
  const size = SPONSOR_IMAGE_SIZES[slot];
  if (
    streams.length !== 1 ||
    !mimeType ||
    stream.width !== size.width ||
    stream.height !== size.height
  )
    throw new Error('Invalid sponsor image');
  return mimeType;
};

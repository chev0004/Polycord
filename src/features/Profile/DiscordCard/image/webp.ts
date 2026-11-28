import 'server-only';
import sharp from 'sharp';
import { DISCORD_CARD_HEIGHT, DISCORD_CARD_WIDTH } from '../types';
import { type Box, changedBox, type Pixels } from './pixels';

const BATCH = 8;
const BLOCK = 16;
const SHARP_AREA = 100_000;
const FULL = {
  x: 0,
  y: 0,
  width: DISCORD_CARD_WIDTH,
  height: DISCORD_CARD_HEIGHT,
};
const NOTHING = { x: 0, y: 0, width: 2, height: 2 };

const uint = (value: number, bytes: number) => {
  const buffer = Buffer.alloc(bytes);
  buffer.writeUIntLE(value, 0, bytes);
  return buffer;
};

const chunk = (type: string, ...parts: Buffer[]) => {
  const payload = Buffer.concat(parts);
  return Buffer.concat([
    Buffer.from(type, 'ascii'),
    uint(payload.length, 4),
    payload,
    Buffer.alloc(payload.length % 2),
  ]);
};

const bitstream = (still: Buffer) => {
  const parts: Buffer[] = [];
  for (let at = 12; at < still.length; ) {
    const type = still.toString('ascii', at, at + 4);
    const size = still.readUInt32LE(at + 4);
    const end = at + 8 + size + (size % 2);
    if (['ALPH', 'VP8 ', 'VP8L'].includes(type))
      parts.push(still.subarray(at, end));
    at = end;
  }
  return Buffer.concat(parts);
};

const encode = async (
  pixels: Pixels,
  { width, height }: Box,
  smartSubsample = width * height < SHARP_AREA,
) =>
  bitstream(
    await sharp(pixels, { raw: { width, height, channels: 4 } })
      .webp({ quality: 90, effort: 2, smartSubsample })
      .toBuffer(),
  );

const patch = (frame: Pixels, previous: Pixels) => {
  const changed = changedBox(frame, previous);
  if (!changed) return;
  const x = changed.x - (changed.x % BLOCK);
  const y = changed.y - (changed.y % BLOCK);
  const box = {
    x,
    y,
    width: changed.x + changed.width - x,
    height: changed.y + changed.height - y,
  };
  const from = new Uint32Array(frame.buffer, frame.byteOffset);
  const last = new Uint32Array(previous.buffer, previous.byteOffset);
  const pixels = new Uint32Array(box.width * box.height);
  for (let top = 0; top < box.height; top += BLOCK) {
    for (let left = 0; left < box.width; left += BLOCK) {
      const width = Math.min(BLOCK, box.width - left);
      const rows = [...Array(Math.min(BLOCK, box.height - top)).keys()].map(
        (row) => (y + top + row) * FULL.width + x + left,
      );
      const same = rows.every((start) => {
        for (let index = start; index < start + width; index++)
          if (from[index] !== last[index]) return false;
        return true;
      });
      if (same) continue;
      rows.forEach((start, row) => {
        pixels.set(
          from.subarray(start, start + width),
          (top + row) * box.width + left,
        );
      });
    }
  }
  return { box, pixels: new Uint8ClampedArray(pixels.buffer) };
};

export const encodeAnimation = async (
  count: number,
  paint: (index: number) => Pixels,
  delay: (index: number) => number,
) => {
  const still = encode(new Uint8ClampedArray(16), NOTHING);
  const frames: Buffer[] = [];
  let previous: Pixels | undefined;

  const frame = async (index: number) => {
    const next = paint(index);
    const first = !previous;
    const changed =
      previous && previous !== next ? patch(next, previous) : undefined;
    previous = next;
    const box = first ? FULL : (changed?.box ?? NOTHING);
    const data = first
      ? encode(next, box, true)
      : changed
        ? encode(changed.pixels, box)
        : still;
    return chunk(
      'ANMF',
      uint(box.x / 2, 3),
      uint(box.y / 2, 3),
      uint(box.width - 1, 3),
      uint(box.height - 1, 3),
      uint(delay(index), 3),
      uint(first ? 2 : 0, 1),
      await data,
    );
  };

  for (let start = 0; start < count; start += BATCH)
    frames.push(
      ...(await Promise.all(
        [...Array(Math.min(BATCH, count - start)).keys()].map((step) =>
          frame(start + step),
        ),
      )),
    );

  return chunk(
    'RIFF',
    Buffer.from('WEBP', 'ascii'),
    chunk(
      'VP8X',
      uint(0x12, 4),
      uint(FULL.width - 1, 3),
      uint(FULL.height - 1, 3),
    ),
    chunk('ANIM', uint(0, 6)),
    ...frames,
  );
};

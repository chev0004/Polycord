import 'server-only';
import sharp from 'sharp';
import { DISCORD_CARD_HEIGHT, DISCORD_CARD_WIDTH } from '../types';
import { type Box, changedBox, type Pixels } from './pixels';

const WIDTH = DISCORD_CARD_WIDTH;
const HEIGHT = DISCORD_CARD_HEIGHT;
const FULL = { x: 0, y: 0, width: WIDTH, height: HEIGHT };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const SOLID_RADIUS = 2;
const SOLID_SHARE = 0.003;
const CLEAR = 0x8000;

const step = (value: number) =>
  Math.min(252, Math.max(4, Math.round((value - 4) / 8) * 8 + 4));

const solidColors = (frame: Pixels) => {
  const pixels = new Uint32Array(
    frame.buffer,
    frame.byteOffset,
    WIDTH * HEIGHT,
  );
  const counts = new Map<number, number>();
  for (let y = SOLID_RADIUS; y < HEIGHT - SOLID_RADIUS; y++) {
    for (let x = SOLID_RADIUS; x < WIDTH - SOLID_RADIUS; x++) {
      const color = pixels[y * WIDTH + x];
      if (color >>> 24 !== 255) continue;
      let solid = true;
      for (let dy = -SOLID_RADIUS; solid && dy <= SOLID_RADIUS; dy++)
        for (let dx = -SOLID_RADIUS; solid && dx <= SOLID_RADIUS; dx++)
          solid = pixels[(y + dy) * WIDTH + x + dx] === color;
      if (solid) counts.set(color, (counts.get(color) ?? 0) + 1);
    }
  }
  return [...counts]
    .filter(([, count]) => count >= SOLID_SHARE * WIDTH * HEIGHT)
    .map(([color]) => color);
};

const levels = (frame: Pixels) => {
  const solid = solidColors(frame);
  const table = new Uint8Array(3 * 16 * 256);
  for (let channel = 0; channel < 3; channel++) {
    const anchors = [
      ...new Set([
        0,
        ...solid.map((color) => (color >>> (8 * channel)) & 255),
        255,
      ]),
    ]
      .sort((a, b) => a - b)
      .map((value) => [value, value % 255 ? step(value) : value]);
    for (let at = 0; at < anchors.length - 1; at++) {
      const [from, start] = anchors[at];
      const [to, end] = anchors[at + 1];
      for (let value = from; value <= to; value++) {
        const curved = start + ((end - start) * (value - from)) / (to - from);
        for (let threshold = 0; threshold < 16; threshold++)
          table[(channel * 16 + threshold) * 256 + value] = Math.min(
            31,
            Math.max(
              0,
              Math.floor((curved - 4) / 8 + (BAYER[threshold] + 0.5) / 16),
            ),
          );
      }
    }
  }
  return table;
};

const snap = (
  frame: Pixels,
  table: Uint8Array,
  shown: Uint16Array,
  { x, y, width, height }: Box,
) => {
  const keys = new Uint16Array(width * height);
  for (let row = 0, at = 0; row < height; row++) {
    for (let column = 0; column < width; column++, at++) {
      const position = (y + row) * WIDTH + x + column;
      const index = position * 4;
      const threshold = (((y + row) & 3) << 2) | ((x + column) & 3);
      const key =
        frame[index + 3] < 128
          ? CLEAR
          : (table[threshold * 256 + frame[index]] << 10) |
            (table[(16 + threshold) * 256 + frame[index + 1]] << 5) |
            table[(32 + threshold) * 256 + frame[index + 2]];
      keys[at] = key === shown[position] ? CLEAR : key;
      shown[position] = key;
    }
  }
  return keys;
};

const channelOf = (key: number, channel: number) =>
  (key >> (10 - 5 * channel)) & 31;

const spread = (keys: number[]) => {
  let widest = { channel: 0, range: 0 };
  for (let channel = 0; channel < 3; channel++) {
    let low = 31;
    let high = 0;
    for (const key of keys) {
      const value = channelOf(key, channel);
      if (value < low) low = value;
      if (value > high) high = value;
    }
    if (high - low > widest.range) widest = { channel, range: high - low };
  }
  return { keys, ...widest };
};

const counts = new Uint32Array(1 << 16);

const medianCut = (colors: number[], slots: number) => {
  const boxes = [spread(colors)];
  while (boxes.length < slots) {
    const widest = boxes.reduce(
      (best, box, at) => (box.range > boxes[best].range ? at : best),
      0,
    );
    const { keys, channel, range } = boxes[widest];
    if (!range) break;
    keys.sort((a, b) => channelOf(a, channel) - channelOf(b, channel));
    const total = keys.reduce((sum, key) => sum + counts[key], 0);
    let cut = 1;
    for (
      let half = counts[keys[0]];
      half < total / 2;
      half += counts[keys[cut++]]
    );
    cut = Math.min(cut, keys.length - 1);
    boxes.splice(
      widest,
      1,
      spread(keys.slice(0, cut)),
      spread(keys.slice(cut)),
    );
  }
  return boxes.map(({ keys }) => keys);
};

const palette = (keys: Uint16Array) => {
  const colors: number[] = [];
  let clear = false;
  for (const key of keys) {
    if (key === CLEAR) clear = true;
    else if (counts[key]++ === 0) colors.push(key);
  }
  const groups =
    colors.length + Number(clear) > 256
      ? medianCut(colors, 256 - Number(clear))
      : colors.map((key) => [key]);
  const lookup = new Uint8Array(1 << 16);
  const entries = groups.map((group, index) => {
    let weight = 0;
    const sums = [0, 0, 0];
    for (const key of group) {
      weight += counts[key];
      for (let channel = 0; channel < 3; channel++)
        sums[channel] += channelOf(key, channel) * counts[key];
      lookup[key] = index;
    }
    return sums.map((sum) => Math.round(sum / weight) * 8 + 4);
  });
  for (const key of colors) counts[key] = 0;
  if (clear) {
    lookup[CLEAR] = entries.length;
    entries.push([0, 0, 0]);
  }
  return { entries, lookup, clear };
};

const codes = new Int32Array(4096 << 8);
const stamps = new Int32Array(4096 << 8);
let generation = 0;

const compress = (indices: Uint8Array, minimum: number) => {
  const clear = 1 << minimum;
  const bytes = new Uint8Array(indices.length * 2 + 16);
  let length = 0;
  let buffer = 0;
  let filled = 0;
  let size = minimum + 1;
  let next = clear + 2;
  const write = (code: number) => {
    buffer |= code << filled;
    filled += size;
    for (; filled >= 8; filled -= 8, buffer >>>= 8) bytes[length++] = buffer;
  };
  const reset = () => {
    generation++;
    size = minimum + 1;
    next = clear + 2;
  };
  write(clear);
  reset();
  let prefix = indices[0];
  for (let at = 1; at < indices.length; at++) {
    const key = (prefix << 8) | indices[at];
    if (stamps[key] === generation) {
      prefix = codes[key];
      continue;
    }
    write(prefix);
    if (next === 4096) {
      write(clear);
      reset();
    } else {
      if (next >= 1 << size) size++;
      stamps[key] = generation;
      codes[key] = next++;
    }
    prefix = indices[at];
  }
  write(prefix);
  write(clear + 1);
  if (filled) bytes[length++] = buffer;

  const blocks = new Uint8Array(length + Math.ceil(length / 255) + 1);
  let at = 0;
  for (let start = 0; start < length; start += 255) {
    const block = bytes.subarray(start, Math.min(length, start + 255));
    blocks[at++] = block.length;
    blocks.set(block, at);
    at += block.length;
  }
  return blocks;
};

const word = (value: number) => [value & 255, value >> 8];

const image = (keys: Uint16Array, box: Box) => {
  const { entries, lookup, clear } = palette(keys);
  const bits = Math.max(1, Math.ceil(Math.log2(entries.length)));
  const indices = new Uint8Array(keys.length);
  for (let at = 0; at < keys.length; at++) indices[at] = lookup[keys[at]];
  const colors = new Uint8Array(3 << bits);
  colors.set(entries.flat());
  return {
    clear: clear ? entries.length - 1 : -1,
    bytes: Buffer.concat([
      Uint8Array.from([
        0x2c,
        ...word(box.x),
        ...word(box.y),
        ...word(box.width),
        ...word(box.height),
        0x80 | (bits - 1),
      ]),
      colors,
      Uint8Array.from([Math.max(2, bits)]),
      compress(indices, Math.max(2, bits)),
    ]),
  };
};

const control = (clear: number, delay: number[]) =>
  Uint8Array.from([
    0x21,
    0xf9,
    4,
    4 | Number(clear >= 0),
    ...delay,
    Math.max(0, clear),
    0,
  ]);

export const encodeAnimation = (
  count: number,
  paint: (index: number) => Pixels,
  delay: (index: number) => number,
) => {
  const first = paint(0);
  const table = levels(first);
  const shown = new Uint16Array(WIDTH * HEIGHT).fill(CLEAR);
  const frames = [{ ...image(snap(first, table, shown, FULL), FULL), time: 0 }];
  let previous = first;
  let time = delay(0);

  for (let index = 1; index < count; time += delay(index++)) {
    const next = paint(index);
    const box = next !== previous && changedBox(next, previous);
    previous = next;
    if (box)
      frames.push({ ...image(snap(next, table, shown, box), box), time });
  }

  const centiseconds = (ms: number) => Math.round(ms / 10);
  const parts = frames.flatMap(({ bytes, clear, time: start }, at) => [
    control(
      clear,
      word(centiseconds(frames[at + 1]?.time ?? time) - centiseconds(start)),
    ),
    bytes,
  ]);

  return Buffer.concat([
    Buffer.from('GIF89a', 'ascii'),
    Uint8Array.from([...word(WIDTH), ...word(HEIGHT), 0, 0, 0]),
    Uint8Array.from([
      0x21,
      0xff,
      11,
      ...Buffer.from('NETSCAPE2.0', 'ascii'),
      3,
      1,
      0,
      0,
      0,
    ]),
    ...parts,
    Uint8Array.from([0x3b]),
  ]);
};

const FIRST_CONTROL = 13 + 19;

export const replaceFirstFrame = async (
  gif: Buffer,
  frame: Pixels,
  box: Box,
) => {
  const shown = await sharp(gif, { page: 0 }).ensureAlpha().raw().toBuffer();
  const keys = new Uint16Array(WIDTH * HEIGHT);
  for (let at = 0; at < keys.length; at++)
    keys[at] =
      shown[at * 4 + 3] < 128
        ? CLEAR
        : (((shown[at * 4] - 4) >> 3) << 10) |
          (((shown[at * 4 + 1] - 4) >> 3) << 5) |
          ((shown[at * 4 + 2] - 4) >> 3);
  const fresh = snap(
    frame,
    levels(frame),
    new Uint16Array(WIDTH * HEIGHT).fill(CLEAR),
    box,
  );
  for (let row = 0; row < box.height; row++)
    keys.set(
      fresh.subarray(row * box.width, (row + 1) * box.width),
      (box.y + row) * WIDTH + box.x,
    );

  const start = FIRST_CONTROL + 8;
  let end = start + 10;
  if (gif[start + 9] & 0x80) end += 3 << ((gif[start + 9] & 7) + 1);
  for (end++; gif[end]; end += gif[end] + 1);
  const { bytes, clear } = image(keys, FULL);

  return Buffer.concat([
    gif.subarray(0, FIRST_CONTROL),
    control(clear, [gif[FIRST_CONTROL + 4], gif[FIRST_CONTROL + 5]]),
    bytes,
    gif.subarray(end + 1),
  ]);
};

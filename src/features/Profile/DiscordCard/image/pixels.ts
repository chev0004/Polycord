import { DISCORD_CARD_HEIGHT, DISCORD_CARD_WIDTH } from '../types';

const WIDTH = DISCORD_CARD_WIDTH;
const HEIGHT = DISCORD_CARD_HEIGHT;

export type Pixels = Uint8ClampedArray;

export type Box = { x: number; y: number; width: number; height: number };

export type Layer = Box & { values: Int16Array };

export type Sprite = { width: number; height: number; pixels: Pixels };

export const clamp = (value: number) => Math.min(1, Math.max(0, value));

export const changedBox = (to: Pixels, from: Pixels): Box | undefined => {
  const next = new Uint32Array(to.buffer, to.byteOffset, to.length / 4);
  const last = new Uint32Array(from.buffer, from.byteOffset, from.length / 4);
  let left = WIDTH;
  let right = -1;
  let top = HEIGHT;
  let bottom = -1;
  for (let y = 0, index = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++, index++) {
      if (next[index] === last[index]) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      bottom = y;
    }
  }
  return right < 0
    ? undefined
    : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
};

export const difference = (to: Pixels, from: Pixels): Layer => {
  const box = changedBox(to, from) ?? { x: 0, y: 0, width: 0, height: 0 };
  const values = new Int16Array(box.width * box.height * 3);
  for (let y = 0, at = 0; y < box.height; y++) {
    for (let x = 0; x < box.width; x++) {
      const index = ((box.y + y) * WIDTH + box.x + x) * 4;
      for (let channel = 0; channel < 3; channel++, at++)
        values[at] = to[index + channel] - from[index + channel];
    }
  }
  return { ...box, values };
};

const addRows = (
  frame: Pixels,
  { x, width, height, values }: Layer,
  top: number,
  weight: number,
) => {
  if (!weight) return;
  for (let row = Math.max(0, -top); row < height; row++) {
    if (top + row >= HEIGHT) return;
    let at = row * width * 3;
    let index = ((top + row) * WIDTH + x) * 4;
    for (let column = 0; column < width; column++, at += 3, index += 4) {
      if (!(values[at] | values[at + 1] | values[at + 2])) continue;
      frame[index] += values[at] * weight;
      frame[index + 1] += values[at + 1] * weight;
      frame[index + 2] += values[at + 2] * weight;
    }
  }
};

export const addLayer = (
  frame: Pixels,
  layer: Layer,
  weight = 1,
  offset = 0,
) => {
  const shift = Math.floor(offset);
  const mix = offset - shift;
  addRows(frame, layer, layer.y + shift, weight * (1 - mix));
  addRows(frame, layer, layer.y + shift + 1, weight * mix);
};

export const addColumns = (
  frame: Pixels,
  { x, y, width, height, values }: Layer,
  column: (at: number) => [source: number, weight: number],
) => {
  for (let at = 0; at < width; at++) {
    const [source, weight] = column(at);
    if (weight <= 0) continue;
    for (let row = 0; row < height; row++) {
      const index = ((y + row) * WIDTH + x + at) * 4;
      const from = (row * width + Math.min(width - 1, source)) * 3;
      for (let channel = 0; channel < 3; channel++)
        frame[index + channel] += values[from + channel] * weight;
    }
  }
};

export const cropSprite = (
  sheet: Pixels,
  sheetWidth: number,
  { x, y, width, height }: Box,
): Sprite => {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row++) {
    const start = ((y + row) * sheetWidth + x) * 4;
    pixels.set(sheet.subarray(start, start + width * 4), row * width * 4);
  }
  return { width, height, pixels };
};

const color = new Float64Array(4);

const sample = ({ width, height, pixels }: Sprite, x: number, y: number) => {
  const left = Math.floor(x);
  const top = Math.floor(y);
  color.fill(0);
  for (let corner = 0; corner < 4; corner++) {
    const column = left + (corner & 1);
    const row = top + (corner >> 1);
    if (column < 0 || row < 0 || column >= width || row >= height) continue;
    const index = (row * width + column) * 4;
    const alpha =
      (pixels[index + 3] / 255) *
      (1 - Math.abs(x - column)) *
      (1 - Math.abs(y - row));
    if (!alpha) continue;
    color[0] += pixels[index] * alpha;
    color[1] += pixels[index + 1] * alpha;
    color[2] += pixels[index + 2] * alpha;
    color[3] += alpha;
  }
  return color;
};

export const drawSprite = (
  frame: Pixels,
  sprite: Sprite,
  x: number,
  y: number,
) => {
  for (let row = Math.floor(y); row < y + sprite.height; row++) {
    if (row < 0 || row >= HEIGHT) continue;
    for (let column = Math.floor(x); column < x + sprite.width; column++) {
      if (column < 0 || column >= WIDTH) continue;
      const color = sample(sprite, column - x, row - y);
      const alpha = color[3];
      if (!alpha) continue;
      const index = (row * WIDTH + column) * 4;
      frame[index] = frame[index] * (1 - alpha) + color[0];
      frame[index + 1] = frame[index + 1] * (1 - alpha) + color[1];
      frame[index + 2] = frame[index + 2] * (1 - alpha) + color[2];
    }
  }
};

export const rotateDisc = (
  frame: Pixels,
  source: Pixels,
  centerX: number,
  centerY: number,
  radius: number,
  degrees: number,
) => {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const below = WIDTH * 4;
  for (let y = centerY - radius; y < centerY + radius; y++) {
    for (let x = centerX - radius; x < centerX + radius; x++) {
      const dx = x + 0.5 - centerX;
      const dy = y + 0.5 - centerY;
      if (dx * dx + dy * dy > radius * radius) continue;
      const u = centerX + dx * cos + dy * sin - 0.5;
      const v = centerY - dx * sin + dy * cos - 0.5;
      const left = Math.floor(u);
      const top = Math.floor(v);
      const right = u - left;
      const down = v - top;
      const from = (top * WIDTH + left) * 4;
      const index = (y * WIDTH + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        const at = from + channel;
        const upper = source[at] + (source[at + 4] - source[at]) * right;
        const lower =
          source[at + below] +
          (source[at + below + 4] - source[at + below]) * right;
        frame[index + channel] = upper + (lower - upper) * down;
      }
    }
  }
};

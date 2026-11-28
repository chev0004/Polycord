import type { CardFont } from './fonts';

type Metrics = { unitsPerEm: number; advance: (code: number) => number | null };

const readMetrics = (buffer: ArrayBuffer): Metrics => {
  const view = new DataView(buffer);
  const tables = new Map<string, number>();
  for (let index = 0; index < view.getUint16(4); index++) {
    const record = 12 + index * 16;
    const tag = String.fromCharCode(
      ...[0, 1, 2, 3].map((byte) => view.getUint8(record + byte)),
    );
    tables.set(tag, view.getUint32(record + 8));
  }
  const table = (tag: string) => tables.get(tag) ?? 0;
  const metricCount = view.getUint16(table('hhea') + 34);
  const cmap = table('cmap');
  const subtables = [...Array(view.getUint16(cmap + 2)).keys()].map(
    (index) => cmap + view.getUint32(cmap + 8 + index * 8),
  );
  const format12 = subtables.find((offset) => view.getUint16(offset) === 12);
  const format4 = subtables.find((offset) => view.getUint16(offset) === 4);

  const glyph = (code: number) => {
    if (format12 !== undefined) {
      for (let group = 0; group < view.getUint32(format12 + 12); group++) {
        const at = format12 + 16 + group * 12;
        const start = view.getUint32(at);
        if (code >= start && code <= view.getUint32(at + 4))
          return view.getUint32(at + 8) + code - start;
      }
      return 0;
    }
    if (format4 === undefined) return 0;
    const segments = view.getUint16(format4 + 6) / 2;
    const ends = format4 + 14;
    const starts = ends + segments * 2 + 2;
    const deltas = starts + segments * 2;
    const ranges = deltas + segments * 2;
    for (let segment = 0; segment < segments; segment++) {
      if (code > view.getUint16(ends + segment * 2)) continue;
      const start = view.getUint16(starts + segment * 2);
      if (code < start) return 0;
      const delta = view.getInt16(deltas + segment * 2);
      const range = view.getUint16(ranges + segment * 2);
      if (!range) return (code + delta) & 0xffff;
      const found = view.getUint16(
        ranges + segment * 2 + range + (code - start) * 2,
      );
      return found ? (found + delta) & 0xffff : 0;
    }
    return 0;
  };

  return {
    unitsPerEm: view.getUint16(table('head') + 18),
    advance: (code) => {
      const index = glyph(code);
      if (!index) return null;
      return view.getUint16(
        table('hmtx') + Math.min(index, metricCount - 1) * 4,
      );
    },
  };
};

const isWide = (code: number) =>
  (code >= 0x1100 && code <= 0x11ff) ||
  (code >= 0x2e80 && code <= 0xa4cf) ||
  (code >= 0xac00 && code <= 0xd7af) ||
  (code >= 0xf900 && code <= 0xfaff) ||
  (code >= 0xff00 && code <= 0xff60);

export type MeasureStyle = {
  size: number;
  weight?: number;
  spacing?: number;
  mono?: boolean;
  zen?: boolean;
};

export type Measure = (text: string, style: MeasureStyle) => number;

export const createMeasure = (fonts: CardFont[]): Measure => {
  const metrics = new Map(
    fonts
      .filter((font) => font.name === 'Figtree' && font.style === 'normal')
      .map((font) => [font.weight, readMetrics(font.data)]),
  );

  const japanese = fonts.find((font) => font.name === 'Zen');
  const zenMetrics = japanese && readMetrics(japanese.data);

  return (text, { size, weight = 400, spacing = 0, mono, zen }) => {
    const font = mono
      ? undefined
      : zen
        ? zenMetrics
        : (metrics.get(weight as CardFont['weight']) ?? metrics.get(400));
    let units = 0;
    for (const char of text) {
      const code = char.codePointAt(0) ?? 0;
      const advance = font?.advance(code);
      units +=
        advance != null && font
          ? advance / font.unitsPerEm
          : isWide(code)
            ? 1
            : 0.6;
    }
    return units * size + spacing * size * [...text].length;
  };
};

export const fitSize = (
  measure: Measure,
  text: string,
  style: MeasureStyle,
  max: number,
) => {
  const natural = measure(text, style);
  return natural > max ? (style.size * max) / natural : style.size;
};

export const fitTags = (
  measure: Measure,
  tags: string[],
  style: MeasureStyle,
  max: number,
) => {
  for (let shown = tags.length; shown > 0; shown--) {
    const more = shown < tags.length ? ` +${tags.length - shown}` : '';
    const text = `${tags.slice(0, shown).join(' · ')}${more}`;
    if (measure(text, style) <= max) return text;
  }
  return tags.length ? `+${tags.length}` : '';
};

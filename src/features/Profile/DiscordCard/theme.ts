import type { CSSProperties } from 'react';
import { blendHex, hexToRgb, isValidHex } from '@/features/Discovery/cardTheme';

const SKY_BANNER = '#c1d5e9';

const luminance = (hex: string) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
};

export const discordCardVars = (banner: string, accent: string) => {
  if (banner === SKY_BANNER) {
    return {
      '--color-primary': SKY_BANNER,
      '--color-primary-light': '#d3e2f0',
      '--color-primary-lighter': '#e5eef7',
      '--color-primary-dark': '#46525f',
      '--color-primary-darker': '#252c33',
      '--cf': SKY_BANNER,
      '--ci': '#111',
      '--ci2': '#46525f',
    } as CSSProperties;
  }

  const flat = isValidHex(banner);
  const stops = flat ? [banner] : (banner.match(/#[0-9a-f]{6}/gi) ?? [accent]);
  const fillLuminance =
    stops.reduce((sum, hex) => sum + luminance(hex), 0) / stops.length;
  const base = flat ? banner : accent;
  const primary =
    luminance(base) < 0.3 ? blendHex(base, '#ffffff', 0.45) : base;
  const light = fillLuminance > 0.45;

  return {
    '--color-primary': primary,
    '--color-primary-light': blendHex(primary, '#ffffff', 0.3),
    '--color-primary-lighter': blendHex(primary, '#ffffff', 0.55),
    '--color-primary-dark': blendHex(primary, '#151516', 0.66),
    '--color-primary-darker': blendHex(primary, '#151516', 0.86),
    '--cf': banner,
    '--ci': light ? '#111' : '#fff',
    '--ci2': light
      ? blendHex(base, '#111111', 0.68)
      : blendHex(base, '#ffffff', 0.7),
  } as CSSProperties;
};

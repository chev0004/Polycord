import type { CSSProperties } from 'react';

export type CardTheme = {
  banner: string;
  tint?: string;
  accent: string;
};

export type CustomGradient = {
  from: string;
  to: string;
};

export const FREE_ACCENT = '#7a8a99';
export const CUSTOM_CARD_THEME_ID = 'custom';
export const DEFAULT_CUSTOM_GRADIENT: CustomGradient = {
  from: '#5964f2',
  to: '#7883f5',
};

export const FREE_CARD_COLORS = [
  { id: 'sky', banner: '#c1d5e9' },
  { id: 'pink', banner: '#f9a8cf' },
  { id: 'slate', banner: '#46525f' },
] as const;

export const DEFAULT_CARD_COLOR = FREE_CARD_COLORS[0].id;

export const PREMIUM_CARD_THEMES = [
  {
    id: 'indigo',
    banner: 'linear-gradient(115deg, #3a45ef, #5964f2 55%, #7883f5)',
    tint: 'rgba(89,100,242,0.07)',
    accent: '#5964f2',
  },
  {
    id: 'gold',
    banner: 'linear-gradient(115deg, #ec9f0a, #f0b133 60%, #f4c35c)',
    tint: 'rgba(240,177,51,0.06)',
    accent: '#d4970a',
  },
  {
    id: 'dusk',
    banner: 'linear-gradient(115deg, #46525f, #5964f2 70%, #7883f5)',
    tint: 'rgba(120,131,245,0.06)',
    accent: '#7883f5',
  },
  {
    id: 'rose',
    banner: 'linear-gradient(115deg, #f9a8cf, #7883f5)',
    tint: 'rgba(249,168,207,0.05)',
    accent: '#c45b95',
  },
  {
    id: 'blue',
    banner: '#5964f2',
    tint: 'rgba(89,100,242,0.06)',
    accent: '#5964f2',
  },
] as const;

export const getFreeCardTheme = (index: number): CardTheme => ({
  banner: FREE_CARD_COLORS[index % FREE_CARD_COLORS.length].banner,
  accent: FREE_ACCENT,
});

export const findCardTheme = (id: string): CardTheme | undefined => {
  const free = FREE_CARD_COLORS.find((color) => color.id === id);
  if (free) return { banner: free.banner, accent: FREE_ACCENT };

  const premium = PREMIUM_CARD_THEMES.find((color) => color.id === id);
  if (premium) {
    return {
      banner: premium.banner,
      tint: premium.tint,
      accent: premium.accent,
    };
  }

  return undefined;
};

export const isValidHex = (hex: string): boolean => /^#[0-9a-f]{6}$/i.test(hex);

export const hexToRgb = (hex: string) => {
  if (!isValidHex(hex)) return null;
  const n = Number.parseInt(hex.slice(1), 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
};

export const rgbToHex = ({ r, g, b }: { r: number; g: number; b: number }) =>
  `#${[r, g, b]
    .map((value) => Math.round(value).toString(16).padStart(2, '0'))
    .join('')}`;

export const blendHex = (from: string, to: string, amount = 0.45): string => {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  if (!a || !b) return from;
  return rgbToHex({
    r: a.r + (b.r - a.r) * amount,
    g: a.g + (b.g - a.g) * amount,
    b: a.b + (b.b - a.b) * amount,
  });
};

export const getCustomCardTheme = (
  gradient: CustomGradient = DEFAULT_CUSTOM_GRADIENT,
): CardTheme => ({
  banner: `linear-gradient(115deg, ${gradient.from}, ${gradient.to})`,
  tint: `${gradient.from}22`,
  accent: blendHex(gradient.from, gradient.to),
});

export const deriveCardAccent = (hex: string): CSSProperties => {
  const rgb = hexToRgb(hex);
  if (!rgb) return {};
  const { r, g, b } = rgb;
  return {
    '--ct-accent': `rgb(${r},${g},${b})`,
    '--ct-chip-bg': `rgba(${r},${g},${b},0.15)`,
    '--ct-chip-text': `color-mix(in srgb, ${hex} 45%, var(--color-foreground))`,
    '--ct-chip-dot': `rgb(${r},${g},${b})`,
  } as CSSProperties;
};

import type { CSSProperties } from 'react';

export type CardTheme = {
  banner: string;
  tint?: string;
  accent: string;
};

export const FREE_ACCENT = '#7a8a99';

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

export const deriveCardAccent = (hex: string): CSSProperties => {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return {};
  const n = Number.parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const tR = Math.round(r + (255 - r) * 0.28);
  const tG = Math.round(g + (255 - g) * 0.28);
  const tB = Math.round(b + (255 - b) * 0.28);
  return {
    '--ct-accent': `rgb(${r},${g},${b})`,
    '--ct-chip-bg': `rgba(${r},${g},${b},0.15)`,
    '--ct-chip-text': `rgb(${tR},${tG},${tB})`,
    '--ct-chip-dot': `rgb(${r},${g},${b})`,
  } as CSSProperties;
};

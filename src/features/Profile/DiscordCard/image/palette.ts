import { hexToRgb } from '@/features/Discovery/cardTheme';
import { discordCardVars } from '../theme';

export type CardPalette = {
  fill: string;
  ink: string;
  ink2: string;
  primary: string;
  light: string;
  lighter: string;
  dark: string;
  darker: string;
  surface: string;
  deep: string;
  soft: string;
  subtle: string;
  line: string;
};

export const cardPalette = (banner: string, accent: string): CardPalette => {
  const vars = discordCardVars(banner, accent) as Record<string, string>;

  return {
    fill: vars['--cf'],
    ink: vars['--ci'],
    ink2: vars['--ci2'],
    primary: vars['--color-primary'],
    light: vars['--color-primary-light'],
    lighter: vars['--color-primary-lighter'],
    dark: vars['--color-primary-dark'],
    darker: vars['--color-primary-darker'],
    surface: '#151516',
    deep: '#111111',
    soft: '#d1d5db',
    subtle: '#929aa7',
    line: 'rgba(255, 255, 255, 0.1)',
  };
};

export const withAlpha = (hex: string, alpha: number) => {
  const rgb = hexToRgb(hex);
  return rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})` : hex;
};

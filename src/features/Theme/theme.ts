export type Theme = 'dark' | 'light';

export const THEME_COOKIE = 'polycord_theme';

export const resolveTheme = (value: string | undefined): Theme =>
  value === 'light' ? 'light' : 'dark';

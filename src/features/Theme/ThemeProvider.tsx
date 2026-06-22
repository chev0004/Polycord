'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { THEME_COOKIE, type Theme } from './theme';

const THEME_MAX_AGE = 60 * 60 * 24 * 365;

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  previewTheme: (theme: Theme) => void;
};

const applyTheme = (theme: Theme) => {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: applyTheme,
  previewTheme: applyTheme,
});

export const ThemeProvider = ({
  initialTheme,
  children,
}: {
  initialTheme: Theme;
  children: React.ReactNode;
}) => {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);

    if (typeof document !== 'undefined') {
      document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${THEME_MAX_AGE}; samesite=lax`;
    }

    try {
      localStorage.setItem(THEME_COOKIE, next);
    } catch {}
  }, []);

  const previewTheme = useCallback((next: Theme) => applyTheme(next), []);

  const value = useMemo(
    () => ({ theme, setTheme, previewTheme }),
    [theme, setTheme, previewTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

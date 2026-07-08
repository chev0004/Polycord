import { describe, expect, it } from 'bun:test';
import {
  getLanguageName,
  isValidLanguageCode,
  languageOptions,
} from './languages';

describe('language switching labels', () => {
  it('localizes language names per app locale', () => {
    expect(getLanguageName('en', 'en')).toBe('English');
    expect(getLanguageName('en', 'ja')).toBe('英語');
    expect(getLanguageName('ja', 'en')).toBe('Japanese');
    expect(getLanguageName('ja', 'ja')).toBe('日本語');
  });

  it('passes unknown values through unchanged', () => {
    expect(getLanguageName('English', 'en')).toBe('English');
  });

  it('falls back to english names for unsupported locales', () => {
    expect(getLanguageName('en', 'fr')).toBe('English');
  });

  it('sorts localized options alphabetically for each locale', () => {
    for (const locale of ['en', 'ja']) {
      const labels = languageOptions(locale).map((option) => option.label);

      expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
    }
  });

  it('validates language codes strictly', () => {
    expect(isValidLanguageCode('en')).toBe(true);
    expect(isValidLanguageCode('EN')).toBe(false);
    expect(isValidLanguageCode('xx')).toBe(false);
    expect(isValidLanguageCode('eng')).toBe(false);
  });
});

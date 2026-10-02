import { describe, expect, it } from 'bun:test';
import {
  getLanguageName,
  getNativeLanguageName,
  isValidLanguageCode,
  languageOptions,
  languages,
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

describe('native language names', () => {
  it('returns a non-empty native name for every language', () => {
    for (const { code } of languages) {
      expect(getNativeLanguageName(code).trim()).not.toBe('');
    }
  });

  it('writes spot-checked languages in their own script', () => {
    expect(getNativeLanguageName('ja')).toBe('日本語');
    expect(getNativeLanguageName('ar')).toBe('العربية');
    expect(getNativeLanguageName('ko')).toBe('한국어');
    expect(getNativeLanguageName('zh')).toBe('中文');
    expect(getNativeLanguageName('es')).toBe('Español');
    expect(getNativeLanguageName('ru')).toBe('Русский');
    expect(getNativeLanguageName('hi')).toBe('हिन्दी');
  });

  it('does not use the English name of another language', () => {
    expect(getNativeLanguageName('bh')).not.toBe('Bhojpuri');
    expect(getNativeLanguageName('ht')).not.toBe('Haitian Creole');
  });

  it('falls back to the code for unknown values', () => {
    expect(getNativeLanguageName('xx')).toBe('xx');
  });
});

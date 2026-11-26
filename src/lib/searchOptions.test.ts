import { describe, expect, it } from 'bun:test';
import { languageOptions } from '@/constants/languages';
import { searchOptions } from './searchOptions';

const labels = (locale: string, query: string) =>
  searchOptions(languageOptions(locale), query).map(({ label }) => label);

describe('searchOptions for languages', () => {
  it('finds a Japanese label by its English name', () => {
    for (const query of ['English', 'eng', 'engli', 'e']) {
      const found = labels('ja', query);
      expect(found.filter((label) => label === '英語')).toHaveLength(1);
    }
    expect(labels('ja', 'English')[0]).toBe('英語');
  });

  it('uses only name prefixes for one character', () => {
    const found = labels('ja', 'e');
    expect(found).toContain('エストニア語');
    expect(found).not.toContain('ギリシャ語');
    expect(labels('en', 're')).toContain('Greek');
  });

  it('matches native names, accents and the active locale label', () => {
    expect(labels('en', '日本語')).toContain('Japanese');
    expect(labels('ja', 'Español')[0]).toBe('スペイン語');
    expect(labels('ja', 'espanol')[0]).toBe('スペイン語');
    expect(labels('ja', '  ＥＳＰＡＮＯＬ ')[0]).toBe('スペイン語');
    expect(labels('ja', '英語')[0]).toBe('英語');
  });

  it('keeps marks outside Latin script meaningful', () => {
    expect(labels('en', 'Русский')).toContain('Russian');
    expect(labels('en', 'Русскии')).not.toContain('Russian');
  });

  it('returns every option for an empty query', () => {
    expect(labels('en', ' ')).toHaveLength(languageOptions('en').length);
  });
});

import { describe, expect, it } from 'bun:test';
import { profileReturn } from './profileReturn';

describe('profileReturn', () => {
  it('returns to discovery with its query and position', () => {
    expect(profileReturn('en', '/en?q=anime&page=2#results')).toEqual({
      href: '/en?q=anime&page=2#results',
      label: 'backToDiscovery',
    });
  });

  it('returns to saved profiles and the editor', () => {
    expect(profileReturn('ja', '/ja/saved').label).toBe('backToSaved');
    expect(profileReturn('ja', '/ja/profile').label).toBe('backToEditor');
  });

  it('falls back to discovery for direct entry and unknown sources', () => {
    const fallback = { href: '/en', label: 'backToDiscovery' } as const;

    expect(profileReturn('en', null)).toEqual(fallback);
    expect(profileReturn('en', '/en/settings')).toEqual(fallback);
    expect(profileReturn('en', '/ja/saved')).toEqual(fallback);
    expect(profileReturn('en', '/enconstructor')).toEqual(fallback);
    expect(profileReturn('en', '//evil.example/en')).toEqual(fallback);
    expect(profileReturn('en', 'https://evil.example/en')).toEqual(fallback);
  });
});

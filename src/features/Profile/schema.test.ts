import { describe, expect, it } from 'bun:test';
import type { ProfileFormValues } from './schema';
import { profileSchema } from './schema';

const validProfile: ProfileFormValues = {
  isPublic: true,
  allowAnonymousCopy: true,
  displayTimezone: true,
  displayAvailability: true,
  primaryLanguage: 'ja',
  targetLanguages: [{ language: 'en', level: 'intermediate' }],
  bio: 'I am looking for a patient English partner.',
  tags: ['Anime', 'Cooking'],
  country: 'JP',
  timezone: 'Asia/Tokyo',
};

const issueMessages = (values: unknown) => {
  const result = profileSchema.safeParse(values);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.message);
};

describe('profileSchema', () => {
  it('accepts a valid profile', () => {
    expect(profileSchema.safeParse(validProfile).success).toBe(true);
  });

  it('requires a known primary language', () => {
    expect(issueMessages({ ...validProfile, primaryLanguage: '' })).toContain(
      'primaryLanguageRequired',
    );
    expect(issueMessages({ ...validProfile, primaryLanguage: 'xx' })).toContain(
      'primaryLanguageInvalid',
    );
  });

  it('requires at least one valid target language', () => {
    expect(issueMessages({ ...validProfile, targetLanguages: [] })).toContain(
      'targetLanguageRequired',
    );
    expect(
      issueMessages({
        ...validProfile,
        targetLanguages: [
          { language: 'en', level: 'intermediate' },
          { language: 'en', level: 'beginner' },
        ],
      }),
    ).toContain('duplicateLanguage');
  });

  it('enforces bio length limits', () => {
    expect(issueMessages({ ...validProfile, bio: 'short' })).toContain(
      'bioTooShort',
    );
    expect(issueMessages({ ...validProfile, bio: 'a'.repeat(501) })).toContain(
      'bioTooLong',
    );
  });

  it('enforces tag rules', () => {
    expect(issueMessages({ ...validProfile, tags: ['a'] })).toContain(
      'tagTooShort',
    );
    expect(
      issueMessages({ ...validProfile, tags: ['anime', 'Anime'] }),
    ).toContain('duplicateTag');
  });

  it('rejects invalid timezones', () => {
    expect(
      profileSchema.safeParse({ ...validProfile, timezone: 'Not/AZone' })
        .success,
    ).toBe(false);
  });
});

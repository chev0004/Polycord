import { describe, expect, it } from 'bun:test';
import type { SettingsFormValues } from './schema';
import { settingsSchema } from './schema';

const validSettings: SettingsFormValues = {
  isPublic: true,
  allowAnonymousCopy: true,
  displayTimezone: true,
  pushNotifications: true,
  profileInteractionAlert: true,
  profileViewAlert: false,
  hideProfileVisits: false,
  productAnalytics: true,
  theme: 'dark',
  applicationLanguage: 'en',
  timeFormat: '24hr',
  languageDisplay: 'long',
  email: 'user@example.com',
};

describe('settingsSchema', () => {
  it('accepts valid settings', () => {
    expect(settingsSchema.safeParse(validSettings).success).toBe(true);
  });

  it('rejects an invalid email with the localized message key', () => {
    const result = settingsSchema.safeParse({
      ...validSettings,
      email: 'not-an-email',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toContain(
        'emailInvalid',
      );
    }
  });

  it('rejects unknown theme and time format values', () => {
    expect(
      settingsSchema.safeParse({ ...validSettings, theme: 'sepia' }).success,
    ).toBe(false);
    expect(
      settingsSchema.safeParse({ ...validSettings, timeFormat: '48hr' })
        .success,
    ).toBe(false);
  });

  it('accepts only supported application locales', () => {
    for (const applicationLanguage of ['', 'de', 'en-US']) {
      expect(
        settingsSchema.safeParse({ ...validSettings, applicationLanguage })
          .success,
      ).toBe(false);
    }
    expect(
      settingsSchema.safeParse({ ...validSettings, applicationLanguage: 'ja' })
        .success,
    ).toBe(true);
  });
});

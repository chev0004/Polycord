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
  applicationLanguage: 'en',
  timeFormat: '24hr',
  languageDisplay: 'long',
};

describe('settingsSchema', () => {
  it('accepts valid settings', () => {
    expect(settingsSchema.safeParse(validSettings).success).toBe(true);
  });

  it('accepts the owner dev toggles and leaves them optional', () => {
    const result = settingsSchema.safeParse({
      ...validSettings,
      loadTracing: true,
      discoverySkeleton: false,
    });
    expect(result.success).toBe(true);
    expect(settingsSchema.safeParse(validSettings).success).toBe(true);
    expect(
      settingsSchema.safeParse({ ...validSettings, loadTracing: 'on' }).success,
    ).toBe(false);
  });

  it('drops a submitted email address', () => {
    expect(
      settingsSchema.parse({ ...validSettings, email: 'user@example.com' }),
    ).not.toHaveProperty('email');
  });

  it('drops a submitted application theme', () => {
    expect(
      settingsSchema.parse({ ...validSettings, theme: 'light' }),
    ).not.toHaveProperty('theme');
  });

  it('rejects unknown time format values', () => {
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

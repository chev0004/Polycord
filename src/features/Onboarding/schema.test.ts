import { expect, test } from 'bun:test';
import { profileSchema } from '@/features/Profile/schema';
import { createOnboardingSchema } from './schema';

test('onboarding caps match editable free and premium profiles', () => {
  for (const premium of [false, true]) {
    const cap = premium ? 8 : 5;
    const values = {
      primaryLanguage: 'ja',
      targetLanguage: 'en',
      proficiencyLevel: 'native-level',
      timezone: 'Asia/Tokyo',
      availability: 'weeknights',
      bio: 'I enjoy meeting new language partners.',
      tags: Array.from({ length: cap }, (_, index) => `tag${index}`),
    };
    const schema = createOnboardingSchema(premium);
    expect(schema.safeParse(values).success).toBe(true);
    expect(
      schema.safeParse({ ...values, tags: [...values.tags, 'extra'] }).success,
    ).toBe(false);
    expect(
      profileSchema.safeParse({
        ...values,
        availability: { days: 'weekdays', from: '18:00', to: '22:00' },
        targetLanguages: [
          { language: values.targetLanguage, level: values.proficiencyLevel },
        ],
        isPublic: true,
        allowAnonymousCopy: true,
        displayTimezone: true,
        displayAvailability: true,
      }).success,
    ).toBe(true);
  }
});

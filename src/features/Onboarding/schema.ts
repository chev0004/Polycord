import { z } from 'zod';
import {
  type Availability,
  availabilityValues,
  isValidIANATimezone,
  isValidLanguageCode,
} from '@/constants/languages';

const proficiencyValues = [
  'beginner',
  'intermediate',
  'advanced',
  'native-level',
] as const;

export const onboardingSchema = z.object({
  primaryLanguage: z.string().refine(isValidLanguageCode, {
    message: 'Please select your primary language.',
  }),
  targetLanguage: z.string().refine(isValidLanguageCode, {
    message: 'Please select the language you want to practice.',
  }),
  proficiencyLevel: z.enum(proficiencyValues, {
    message: 'Please select your current level.',
  }),
  timezone: z.string().refine(isValidIANATimezone, {
    message: 'Please use a valid timezone.',
  }),
  availability: z.enum(
    availabilityValues as unknown as [Availability, ...Availability[]],
    {
      message: 'Please choose when you are usually available.',
    },
  ),
  bio: z
    .string()
    .trim()
    .min(10, { message: 'Write at least 10 characters about yourself.' })
    .max(500, { message: 'Keep your bio under 500 characters.' }),
  country: z
    .string()
    .refine((value) => !value || /^[A-Z]{2}$/.test(value), {
      message: 'Please choose a valid country.',
    })
    .optional(),
  tags: z
    .array(
      z
        .string()
        .trim()
        .min(2, { message: 'Tags must be at least 2 characters.' })
        .max(20, { message: 'Tags must be 20 characters or fewer.' }),
    )
    .max(6, { message: 'You can add up to 6 tags.' })
    .refine(
      (items) =>
        new Set(items.map((item) => item.toLowerCase())).size === items.length,
      { message: 'Each tag can only be added once.' },
    )
    .optional(),
});

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;

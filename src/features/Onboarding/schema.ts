import { z } from 'zod';
import {
  type Availability,
  availabilityValues,
  isValidIANATimezone,
} from '@/constants/languages';
import {
  bioField,
  hasUniqueTags,
  languageCodeField,
  optionalCountryField,
  tagItemField,
} from '@/lib/profileFields';

const proficiencyValues = [
  'beginner',
  'intermediate',
  'advanced',
  'native-level',
] as const;

export const onboardingSchema = z.object({
  primaryLanguage: languageCodeField({
    invalid: 'Please select your primary language.',
  }),
  targetLanguage: languageCodeField({
    invalid: 'Please select the language you want to practice.',
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
  bio: bioField({
    tooShort: 'Write at least 10 characters about yourself.',
    tooLong: 'Keep your bio under 500 characters.',
  }),
  country: optionalCountryField('Please choose a valid country.'),
  tags: z
    .array(
      tagItemField({
        tooShort: 'Tags must be at least 2 characters.',
        tooLong: 'Tags must be 20 characters or fewer.',
      }),
    )
    .max(6, { message: 'You can add up to 6 tags.' })
    .refine(hasUniqueTags, { message: 'Each tag can only be added once.' })
    .optional(),
});

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;

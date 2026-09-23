import { z } from 'zod';
import { isValidIANATimezone, isValidProficiency } from '@/constants/languages';
import { entitlementLimit } from '@/lib/entitlements';
import {
  bioField,
  hasUniqueTags,
  languageCodeField,
  optionalCountryField,
  tagItemField,
} from '@/lib/profileFields';

export const FREE_LANGUAGE_CAP = entitlementLimit(
  'profile.targetLanguages',
  false,
);
export const PREMIUM_LANGUAGE_CAP = entitlementLimit(
  'profile.targetLanguages',
  true,
);

const hexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i);

export const profileSchema = z.object({
  isPublic: z.boolean(),
  allowAnonymousCopy: z.boolean(),
  displayTimezone: z.boolean(),
  displayAvailability: z.boolean(),

  primaryLanguage: languageCodeField({
    required: 'primaryLanguageRequired',
    invalid: 'primaryLanguageInvalid',
  }),

  targetLanguages: z
    .array(
      z.object({
        language: languageCodeField({
          required: 'targetLanguageRequired',
          invalid: 'targetLanguageInvalid',
        }),
        level: z
          .string()
          .min(1, { message: 'proficiencyLevelRequired' })
          .refine((val) => Boolean(isValidProficiency(val)), {
            message: 'proficiencyLevelRequired',
          }),
      }),
    )
    .min(1, { message: 'targetLanguageRequired' })
    .max(PREMIUM_LANGUAGE_CAP, { message: 'maxLanguages' })
    .refine(
      (rows) => {
        const languages = rows.map((row) => row.language).filter(Boolean);
        return new Set(languages).size === languages.length;
      },
      { message: 'duplicateLanguage' },
    ),

  bio: bioField({
    required: 'bioRequired',
    tooShort: 'bioTooShort',
    tooLong: 'bioTooLong',
  }),

  availability: z
    .object({
      days: z.enum(['any', 'weekdays', 'weekends']),
      from: z.string(),
      to: z.string(),
      anyTime: z.boolean().optional(),
    })
    .nullable()
    .optional(),

  tags: z
    .array(tagItemField({ tooShort: 'tagTooShort', tooLong: 'tagTooLong' }))
    .max(entitlementLimit('profile.tags', true), { message: 'maxTags' })
    .refine(hasUniqueTags, { message: 'duplicateTag' })
    .optional(),

  country: optionalCountryField('countryInvalid'),

  voiceIntroSeconds: z.number().int().min(0).max(20).optional(),

  cardColor: z.string().optional(),

  customGradient: z
    .object({
      from: hexColorSchema,
      to: hexColorSchema,
    })
    .optional(),

  accentOverride: hexColorSchema.nullable().optional(),

  timezone: z
    .string()
    .refine((val) => !val || isValidIANATimezone(val), {
      message:
        'Invalid timezone format. Must be a valid IANA timezone identifier.',
    })
    .optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

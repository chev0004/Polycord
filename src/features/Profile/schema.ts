import { z } from 'zod';
import { isValidIANATimezone, isValidProficiency } from '@/constants/languages';

export const FREE_LANGUAGE_CAP = 2;
export const PREMIUM_LANGUAGE_CAP = 10;

const hexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i);

export const profileSchema = z.object({
  isPublic: z.boolean(),
  allowAnonymousCopy: z.boolean(),
  displayTimezone: z.boolean(),

  primaryLanguage: z.string().min(1, { message: 'primaryLanguageRequired' }),

  targetLanguages: z
    .array(
      z.object({
        language: z.string().min(1, { message: 'targetLanguageRequired' }),
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

  bio: z
    .string()
    .min(1, { message: 'bioRequired' })
    .min(10, { message: 'bioTooShort' })
    .max(500, { message: 'bioTooLong' }),

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
    .array(
      z
        .string()
        .min(2, { message: 'tagTooShort' })
        .max(20, { message: 'tagTooLong' }),
    )
    .max(8, { message: 'maxTags' })
    .refine(
      (items) =>
        new Set(items.map((item) => item.toLowerCase())).size === items.length,
      {
        message: 'duplicateTag',
      },
    )
    .optional(),

  country: z.string().optional(),

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

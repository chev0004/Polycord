import { z } from 'zod';

export const profileSchema = z.object({
  isPublic: z.boolean(),
  allowAnonymousCopy: z.boolean(),
  displayTimezone: z.boolean(),

  primaryLanguage: z.string().min(1, { message: 'primaryLanguageRequired' }),

  targetLanguage: z.string().min(1, { message: 'targetLanguageRequired' }),

  proficiencyLevel: z.string().min(1, { message: 'proficiencyLevelRequired' }),

  bio: z
    .string()
    .min(1, { message: 'bioRequired' })
    .min(10, { message: 'bioTooShort' })
    .max(500, { message: 'bioTooLong' }),

  tags: z
    .array(
      z
        .string()
        .min(2, { message: 'tagTooShort' })
        .max(20, { message: 'tagTooLong' }),
    )
    .max(6, { message: 'maxTags' })
    .refine(
      (items) =>
        new Set(items.map((item) => item.toLowerCase())).size === items.length,
      {
        message: 'duplicateTag',
      },
    )
    .optional(),

  country: z.string().optional(),

  timezone: z.string().optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

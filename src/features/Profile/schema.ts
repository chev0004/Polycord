import { z } from 'zod';

export const profileSchema = z.object({
  isPublic: z.boolean(),
  allowAnonymousCopy: z.boolean(),
  displayTimezone: z.boolean(),

  primaryLanguage: z.string().min(1, 'Please select your primary language.'),

  targetLanguage: z.string().min(1, 'Please select your target language.'),

  proficiencyLevel: z.string().min(1, 'Please select your proficiency level.'),

  bio: z.string().max(500, 'Bio must be 500 characters or less.').optional(),

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

  country: z
    .string()
    .max(50, 'Country must be 50 characters or less.')
    .optional(),

  timezone: z
    .string()
    .max(100, 'Timezone must be 100 characters or less.')
    .optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

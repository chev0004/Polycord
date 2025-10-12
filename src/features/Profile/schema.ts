import { z } from 'zod';

export const profileSchema = z.object({
  allowAnonymousCopy: z.boolean(),
  displayTimezone: z.boolean(),

  primaryLanguage: z.string().min(1, 'Please select your primary language.'),

  targetLanguage: z.string().min(1, 'Please select your target language.'),

  proficiencyLevel: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional(),

  bio: z.string().max(500, 'Bio must be 500 characters or less.').optional(),

  interests: z
    .string()
    .max(100, 'Interests list must be 100 characters or less.')
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

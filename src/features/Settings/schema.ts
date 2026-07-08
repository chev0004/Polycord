import { z } from 'zod';

export const settingsSchema = z.object({
  isPublic: z.boolean(),
  allowAnonymousCopy: z.boolean(),
  displayTimezone: z.boolean(),
  activityStatus: z.boolean(),
  pushNotifications: z.boolean(),
  matchAlert: z.boolean(),
  profileInteractionAlert: z.boolean(),
  profileViewAlert: z.boolean(),
  productAnalytics: z.boolean(),
  theme: z.enum(['dark', 'light']),
  applicationLanguage: z.string().min(1),
  timeFormat: z.enum(['12hr', '24hr']),
  languageDisplay: z.enum(['long', 'short']),
  email: z
    .string()
    .email({ message: 'emailInvalid' })
    .min(1, { message: 'emailRequired' }),
});

export type SettingsFormValues = z.infer<typeof settingsSchema>;

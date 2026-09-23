import { z } from 'zod';
import { locales } from '@/utils/locales';

export const settingsSchema = z.object({
  isPublic: z.boolean(),
  allowAnonymousCopy: z.boolean(),
  displayTimezone: z.boolean(),
  pushNotifications: z.boolean(),
  profileInteractionAlert: z.boolean(),
  profileViewAlert: z.boolean(),
  hideProfileVisits: z.boolean(),
  productAnalytics: z.boolean(),
  theme: z.enum(['dark', 'light']),
  applicationLanguage: z.enum(locales),
  timeFormat: z.enum(['12hr', '24hr']),
  languageDisplay: z.enum(['long', 'short']),
  email: z
    .string()
    .email({ message: 'emailInvalid' })
    .min(1, { message: 'emailRequired' }),
});

export type SettingsFormValues = z.infer<typeof settingsSchema>;

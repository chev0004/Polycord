import 'server-only';

import { eq } from 'drizzle-orm';
import { db } from './client';
import {
  type NewProfile,
  type NewUserSettings,
  profiles,
  type UserSettings,
  userSettings,
  users,
} from './schema';

export type UserSettingsValues = Pick<
  NewUserSettings,
  | 'theme'
  | 'applicationLanguage'
  | 'timeFormat'
  | 'activityStatus'
  | 'pushNotifications'
  | 'matchAlert'
  | 'profileInteractionAlert'
  | 'profileViewAlert'
>;

export type ProfilePrivacyValues = Pick<
  NewProfile,
  'isPublic' | 'allowAnonymousCopy' | 'displayTimezone'
>;

export const getUserSettingsByUserId = async (
  userId: string,
): Promise<UserSettings | null> => {
  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return settings ?? null;
};

export const getUserSettingsByDiscordUserId = async (
  discordUserId: string,
): Promise<UserSettings | null> => {
  const [row] = await db
    .select({ settings: userSettings })
    .from(userSettings)
    .innerJoin(users, eq(userSettings.userId, users.id))
    .where(eq(users.discordUserId, discordUserId))
    .limit(1);

  return row?.settings ?? null;
};

export const upsertUserSettings = async (
  userId: string,
  values: UserSettingsValues,
) => {
  const [settings] = await db
    .insert(userSettings)
    .values({ ...values, userId })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { ...values, updatedAt: new Date() },
    })
    .returning();

  return settings;
};

export const updateUserEmail = async (userId: string, email: string) => {
  await db
    .update(users)
    .set({ email, updatedAt: new Date() })
    .where(eq(users.id, userId));
};

export const updateProfilePrivacyForUser = async (
  userId: string,
  privacy: ProfilePrivacyValues,
) => {
  const updated = await db
    .update(profiles)
    .set({ ...privacy, updatedAt: new Date() })
    .where(eq(profiles.userId, userId))
    .returning({ id: profiles.id });

  return updated.length > 0;
};

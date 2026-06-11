import 'server-only';

import { eq } from 'drizzle-orm';
import { db } from './client';
import { profiles, users } from './schema';

export const getAccountExportByDiscordId = async (discordUserId: string) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.discordUserId, discordUserId))
    .limit(1);

  if (!user) {
    return null;
  }

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  return {
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      discordUserId: user.discordUserId,
      discordUsername: user.discordUsername,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
    profile: profile
      ? {
          id: profile.id,
          isPublic: profile.isPublic,
          allowAnonymousCopy: profile.allowAnonymousCopy,
          displayTimezone: profile.displayTimezone,
          primaryLanguage: profile.primaryLanguage,
          targetLanguage: profile.targetLanguage,
          proficiencyLevel: profile.proficiencyLevel,
          bio: profile.bio,
          availability: profile.availability,
          tags: profile.tags,
          country: profile.country,
          timezone: profile.timezone,
          createdAt: profile.createdAt.toISOString(),
          updatedAt: profile.updatedAt.toISOString(),
        }
      : null,
    retention: {
      retainedAfterDeletion:
        'Profile and account rows are deleted. Future safety, report, moderation, billing, and legal records may be retained when those systems exist.',
    },
  };
};

export const deleteAccountByDiscordId = async (discordUserId: string) => {
  const deletedUsers = await db
    .delete(users)
    .where(eq(users.discordUserId, discordUserId))
    .returning({ id: users.id });

  return deletedUsers.length > 0;
};

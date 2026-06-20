import 'server-only';

import { asc, eq } from 'drizzle-orm';
import { db } from './client';
import { mapProfileAvailability } from './profiles';
import { profiles, profileTargetLanguages, users } from './schema';

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

  const targetLanguages = profile
    ? await db
        .select({
          language: profileTargetLanguages.language,
          level: profileTargetLanguages.proficiencyLevel,
        })
        .from(profileTargetLanguages)
        .where(eq(profileTargetLanguages.profileId, profile.id))
        .orderBy(asc(profileTargetLanguages.position))
    : [];

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
          displayAvailability: profile.displayAvailability,
          primaryLanguage: profile.primaryLanguage,
          targetLanguage: profile.targetLanguage,
          targetLanguages: targetLanguages.length
            ? targetLanguages
            : [
                {
                  language: profile.targetLanguage,
                  level: profile.proficiencyLevel,
                },
              ],
          proficiencyLevel: profile.proficiencyLevel,
          bio: profile.bio,
          availability: profile.availability,
          availabilityWindow: mapProfileAvailability(profile) ?? null,
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

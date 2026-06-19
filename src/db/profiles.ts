import 'server-only';

import { asc, desc, eq, inArray } from 'drizzle-orm';
import { availabilityPresetToPattern } from '@/constants/availability';
import { isValidAvailability } from '@/constants/languages';
import type { ViewerMatchProfile } from '@/features/Discovery/discoveryMatch';
import type { DiscoveryProfile } from '@/features/Discovery/ProfileCard';
import type { CurrentUser } from '@/lib/auth-session';
import { db } from './client';
import {
  type NewProfile,
  type NewUser,
  type Profile,
  profiles,
  profileTargetLanguages,
  type User,
  users,
} from './schema';

export type ProfileValues = Pick<
  NewProfile,
  | 'allowAnonymousCopy'
  | 'bio'
  | 'availability'
  | 'country'
  | 'displayTimezone'
  | 'isPublic'
  | 'primaryLanguage'
  | 'tags'
  | 'timezone'
> & {
  targetLanguages: ProfileTargetLanguageValue[];
};

export type ProfileTargetLanguageValue = {
  language: string;
  level: Profile['proficiencyLevel'];
};

export type ProfileWithUser = {
  profile: Profile;
  targetLanguages: ProfileTargetLanguageValue[];
  user: User;
};

const toUserValues = (user: CurrentUser): NewUser => ({
  discordUserId: user.id,
  discordUsername: user.username ?? user.name,
  displayName: user.name,
  avatarUrl: user.avatarUrl,
  email: user.email,
});

const toDiscoveryProfile = ({
  profile,
  targetLanguages,
  user,
}: ProfileWithUser): DiscoveryProfile => ({
  id: profile.id,
  displayName: user.displayName,
  discordUsername: user.discordUsername,
  avatarUrl: user.avatarUrl ?? undefined,
  primaryLanguage: profile.primaryLanguage,
  targetLanguages,
  about: profile.bio,
  interests: profile.tags,
  country: profile.country ?? undefined,
  timezone: profile.displayTimezone
    ? (profile.timezone ?? undefined)
    : undefined,
  availability:
    isValidAvailability(profile.availability) &&
    profile.availability !== 'flexible'
      ? availabilityPresetToPattern(profile.availability)
      : undefined,
  allowAnonymousCopy: profile.allowAnonymousCopy,
});

const targetLanguagesForProfile = (
  profile: Profile,
  targetLanguages: ProfileTargetLanguageValue[] | undefined,
) =>
  targetLanguages?.length
    ? targetLanguages
    : [
        {
          language: profile.targetLanguage,
          level: profile.proficiencyLevel,
        },
      ];

const listTargetLanguagesByProfileIds = async (profileIds: string[]) => {
  const byProfile = new Map<string, ProfileTargetLanguageValue[]>();

  if (!profileIds.length) {
    return byProfile;
  }

  const rows = await db
    .select({
      profileId: profileTargetLanguages.profileId,
      language: profileTargetLanguages.language,
      level: profileTargetLanguages.proficiencyLevel,
    })
    .from(profileTargetLanguages)
    .where(inArray(profileTargetLanguages.profileId, profileIds))
    .orderBy(asc(profileTargetLanguages.position));

  for (const row of rows) {
    const targetLanguages = byProfile.get(row.profileId) ?? [];
    targetLanguages.push({
      language: row.language,
      level: row.level,
    });
    byProfile.set(row.profileId, targetLanguages);
  }

  return byProfile;
};

const attachTargetLanguages = async (
  row: Omit<ProfileWithUser, 'targetLanguages'>,
) => {
  const targetLanguagesByProfile = await listTargetLanguagesByProfileIds([
    row.profile.id,
  ]);

  return {
    ...row,
    targetLanguages: targetLanguagesForProfile(
      row.profile,
      targetLanguagesByProfile.get(row.profile.id),
    ),
  };
};

export const upsertDiscordUser = async (currentUser: CurrentUser) => {
  const values = toUserValues(currentUser);
  const [user] = await db
    .insert(users)
    .values(values)
    .onConflictDoUpdate({
      target: users.discordUserId,
      set: {
        discordUsername: values.discordUsername,
        displayName: values.displayName,
        avatarUrl: values.avatarUrl,
        email: values.email,
        updatedAt: new Date(),
      },
    })
    .returning();

  return user;
};

export const getUserByDiscordId = async (discordUserId: string) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.discordUserId, discordUserId))
    .limit(1);

  return user ?? null;
};

export const getProfileById = async (profileId: string) => {
  const [row] = await db
    .select({
      profile: profiles,
      user: users,
    })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .where(eq(profiles.id, profileId))
    .limit(1);

  return row ? attachTargetLanguages(row) : null;
};

export const getProfileByUserId = async (userId: string) => {
  const [row] = await db
    .select({
      profile: profiles,
      user: users,
    })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .where(eq(profiles.userId, userId))
    .limit(1);

  return row ? attachTargetLanguages(row) : null;
};

export const getProfileByDiscordUserId = async (discordUserId: string) => {
  const [row] = await db
    .select({
      profile: profiles,
      user: users,
    })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .where(eq(users.discordUserId, discordUserId))
    .limit(1);

  return row ? attachTargetLanguages(row) : null;
};

export const getPublicProfileById = async (profileId: string) => {
  const row = await getProfileById(profileId);

  if (!row?.profile.isPublic) {
    return null;
  }

  return row;
};

export const listPublicProfiles = async () => {
  const rows = await db
    .select({
      profile: profiles,
      user: users,
    })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .where(eq(profiles.isPublic, true))
    .orderBy(desc(profiles.updatedAt));

  const targetLanguagesByProfile = await listTargetLanguagesByProfileIds(
    rows.map((row) => row.profile.id),
  );

  return rows.map((row) =>
    toDiscoveryProfile({
      ...row,
      targetLanguages: targetLanguagesForProfile(
        row.profile,
        targetLanguagesByProfile.get(row.profile.id),
      ),
    }),
  );
};

export const upsertProfileForUser = async (
  userId: string,
  values: ProfileValues,
) => {
  const { targetLanguages, ...profileValues } = values;
  const [primaryTarget] = targetLanguages;

  if (!primaryTarget) {
    throw new Error('Profile requires at least one target language.');
  }

  const writableProfileValues = {
    ...profileValues,
    proficiencyLevel: primaryTarget.level,
    targetLanguage: primaryTarget.language,
  };

  return db.transaction(async (tx) => {
    const [profile] = await tx
      .insert(profiles)
      .values({
        ...writableProfileValues,
        userId,
      })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: {
          ...writableProfileValues,
          updatedAt: new Date(),
        },
      })
      .returning();

    await tx
      .delete(profileTargetLanguages)
      .where(eq(profileTargetLanguages.profileId, profile.id));

    await tx.insert(profileTargetLanguages).values(
      targetLanguages.map((targetLanguage, position) => ({
        language: targetLanguage.language,
        position,
        profileId: profile.id,
        proficiencyLevel: targetLanguage.level,
      })),
    );

    return profile;
  });
};

export const deleteProfileForUser = async (userId: string) => {
  const deletedProfiles = await db
    .delete(profiles)
    .where(eq(profiles.userId, userId))
    .returning({ id: profiles.id });

  return deletedProfiles.length > 0;
};

export const mapProfileToDiscoveryProfile = toDiscoveryProfile;

export const mapProfileToViewerMatch = ({
  profile,
  targetLanguages,
}: ProfileWithUser): ViewerMatchProfile => ({
  primaryLanguage: profile.primaryLanguage,
  targetLanguages: targetLanguages.map((target) => ({
    language: target.language,
    level: target.level,
  })),
  interests: profile.tags,
  timezone: profile.displayTimezone
    ? (profile.timezone ?? undefined)
    : undefined,
});

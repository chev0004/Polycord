import 'server-only';

import { desc, eq } from 'drizzle-orm';
import type { DiscoveryProfile } from '@/features/Discovery/ProfileCard';
import type { CurrentUser } from '@/lib/auth-session';
import { db } from './client';
import {
  type NewProfile,
  type NewUser,
  type Profile,
  profiles,
  type User,
  users,
} from './schema';

export type ProfileValues = Pick<
  NewProfile,
  | 'allowAnonymousCopy'
  | 'bio'
  | 'country'
  | 'displayTimezone'
  | 'isPublic'
  | 'primaryLanguage'
  | 'proficiencyLevel'
  | 'tags'
  | 'targetLanguage'
  | 'timezone'
>;

type ProfileWithUser = {
  profile: Profile;
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
  user,
}: ProfileWithUser): DiscoveryProfile => ({
  id: profile.id,
  displayName: user.displayName,
  discordUsername: user.discordUsername,
  avatarUrl: user.avatarUrl ?? undefined,
  primaryLanguage: profile.primaryLanguage,
  targetLanguages: [
    {
      language: profile.targetLanguage,
      level: profile.proficiencyLevel,
    },
  ],
  about: profile.bio,
  interests: profile.tags,
  country: profile.country ?? undefined,
  timezone: profile.displayTimezone
    ? (profile.timezone ?? undefined)
    : undefined,
  allowAnonymousCopy: profile.allowAnonymousCopy,
});

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

  return row ?? null;
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

  return row ?? null;
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

  return row ?? null;
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

  return rows.map(toDiscoveryProfile);
};

export const upsertProfileForUser = async (
  userId: string,
  values: ProfileValues,
) => {
  const [profile] = await db
    .insert(profiles)
    .values({
      ...values,
      userId,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        ...values,
        updatedAt: new Date(),
      },
    })
    .returning();

  return profile;
};

export const mapProfileToDiscoveryProfile = toDiscoveryProfile;

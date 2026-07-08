import 'server-only';

import { and, asc, desc, eq, inArray, notInArray, sql } from 'drizzle-orm';
import {
  type AvailabilityPattern,
  availabilityPatternToPreset,
  availabilityPresetToPattern,
} from '@/constants/availability';
import { isValidAvailability } from '@/constants/languages';
import {
  type CardTheme,
  CUSTOM_CARD_THEME_ID,
  findCardTheme,
  getCustomCardTheme,
  PREMIUM_CARD_THEMES,
} from '@/features/Discovery/cardTheme';
import type { DiscoveryProfile } from '@/features/Discovery/ProfileCard';
import type { CurrentUser } from '@/lib/auth-session';
import { isPremiumDiscordId } from '@/lib/entitlements';
import { isSubscriptionActive } from './billing';
import { db } from './client';
import {
  type NewProfile,
  type NewUser,
  type Profile,
  profiles,
  profileTargetLanguages,
  type Subscription,
  subscriptions,
  type User,
  users,
} from './schema';

export type ProfileValues = Pick<
  NewProfile,
  | 'accentOverride'
  | 'allowAnonymousCopy'
  | 'bio'
  | 'cardColor'
  | 'country'
  | 'customGradientFrom'
  | 'customGradientTo'
  | 'displayAvailability'
  | 'displayTimezone'
  | 'isPublic'
  | 'primaryLanguage'
  | 'tags'
  | 'timezone'
> & {
  availability: AvailabilityPattern | null;
  targetLanguages: ProfileTargetLanguageValue[];
};

export type ProfileTargetLanguageValue = {
  language: string;
  level: Profile['proficiencyLevel'];
};

type ProfileWithUser = {
  profile: Profile;
  targetLanguages: ProfileTargetLanguageValue[];
  user: User;
  subscription?: Subscription | null;
};

const isPremiumOwner = (
  user: User,
  subscription: Subscription | null | undefined,
) =>
  isPremiumDiscordId(user.discordUserId) ||
  isSubscriptionActive(subscription ?? null);

const toCardTheme = (
  profile: Profile,
  premium: boolean,
): CardTheme | undefined => {
  if (!profile.cardColor) {
    return undefined;
  }

  let theme: CardTheme | undefined;

  if (profile.cardColor === CUSTOM_CARD_THEME_ID) {
    theme =
      premium && profile.customGradientFrom && profile.customGradientTo
        ? getCustomCardTheme({
            from: profile.customGradientFrom,
            to: profile.customGradientTo,
          })
        : undefined;
  } else if (
    premium ||
    !PREMIUM_CARD_THEMES.some((candidate) => candidate.id === profile.cardColor)
  ) {
    theme = findCardTheme(profile.cardColor);
  }

  if (theme && premium && profile.accentOverride) {
    return { ...theme, accent: profile.accentOverride };
  }

  return theme;
};

const toUserValues = (user: CurrentUser): NewUser => ({
  discordUserId: user.id,
  discordUsername: user.username ?? user.name,
  displayName: user.name,
  avatarUrl: user.avatarUrl,
  email: user.email,
});

const toAvailabilityPattern = (
  profile: Profile,
): AvailabilityPattern | undefined => {
  if (profile.availabilityDays) {
    return {
      days: profile.availabilityDays as AvailabilityPattern['days'],
      from: profile.availabilityFrom ?? '',
      to: profile.availabilityTo ?? '',
      anyTime: profile.availabilityAnyTime || undefined,
    };
  }

  if (
    isValidAvailability(profile.availability) &&
    profile.availability !== 'flexible'
  ) {
    return availabilityPresetToPattern(profile.availability);
  }

  return undefined;
};

const toAvailabilityColumns = (pattern: AvailabilityPattern | null) => {
  if (!pattern) {
    return {
      availability: 'flexible',
      availabilityDays: null,
      availabilityFrom: null,
      availabilityTo: null,
      availabilityAnyTime: false,
    };
  }

  return {
    availability: availabilityPatternToPreset(pattern),
    availabilityDays: pattern.days,
    availabilityFrom: pattern.anyTime ? null : pattern.from,
    availabilityTo: pattern.anyTime ? null : pattern.to,
    availabilityAnyTime: Boolean(pattern.anyTime),
  };
};

const toDiscoveryProfile = ({
  profile,
  targetLanguages,
  user,
  subscription,
}: ProfileWithUser): DiscoveryProfile => ({
  premium: isPremiumOwner(user, subscription),
  cardTheme: toCardTheme(profile, isPremiumOwner(user, subscription)),
  boosted:
    isPremiumOwner(user, subscription) &&
    profile.boostedUntil !== null &&
    profile.boostedUntil.getTime() > Date.now(),
  voiceIntroSeconds:
    isPremiumOwner(user, subscription) && profile.voiceIntroSeconds
      ? profile.voiceIntroSeconds
      : undefined,
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
  availability: profile.displayAvailability
    ? toAvailabilityPattern(profile)
    : undefined,
  allowAnonymousCopy: profile.allowAnonymousCopy,
  lastBumpedAt: profile.lastBumpedAt?.toISOString(),
  bumpedMinutesAgo: profile.lastBumpedAt
    ? Math.max(
        0,
        Math.floor((Date.now() - profile.lastBumpedAt.getTime()) / 60000),
      )
    : undefined,
});

export type ViewerAvailabilityContext = {
  timezone?: string;
  availability?: AvailabilityPattern;
};

export const toViewerAvailabilityContext = (
  profile: Profile,
): ViewerAvailabilityContext => ({
  timezone: profile.timezone ?? undefined,
  availability: toAvailabilityPattern(profile),
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
      subscription: subscriptions,
    })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
    .where(eq(profiles.id, profileId))
    .limit(1);

  return row ? attachTargetLanguages(row) : null;
};

export const getProfileByUserId = async (userId: string) => {
  const [row] = await db
    .select({
      profile: profiles,
      user: users,
      subscription: subscriptions,
    })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
    .where(eq(profiles.userId, userId))
    .limit(1);

  return row ? attachTargetLanguages(row) : null;
};

export const getProfileByDiscordUserId = async (discordUserId: string) => {
  const [row] = await db
    .select({
      profile: profiles,
      user: users,
      subscription: subscriptions,
    })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
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

export const listPublicProfiles = async (
  options: { blockedUserIds?: string[] } = {},
) => {
  const { blockedUserIds = [] } = options;
  const visibility = blockedUserIds.length
    ? and(
        eq(profiles.isPublic, true),
        notInArray(profiles.userId, blockedUserIds),
      )
    : eq(profiles.isPublic, true);

  const rows = await db
    .select({
      profile: profiles,
      user: users,
      subscription: subscriptions,
    })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
    .where(visibility)
    .orderBy(
      sql`${profiles.lastBumpedAt} desc nulls last`,
      desc(profiles.updatedAt),
    );

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

export const listPublicProfilesByIds = async (
  profileIds: string[],
): Promise<DiscoveryProfile[]> => {
  if (!profileIds.length) {
    return [];
  }

  const rows = await db
    .select({
      profile: profiles,
      user: users,
      subscription: subscriptions,
    })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
    .where(and(inArray(profiles.id, profileIds), eq(profiles.isPublic, true)));

  const targetLanguagesByProfile = await listTargetLanguagesByProfileIds(
    rows.map((row) => row.profile.id),
  );

  const byId = new Map(
    rows.map((row) => [
      row.profile.id,
      toDiscoveryProfile({
        ...row,
        targetLanguages: targetLanguagesForProfile(
          row.profile,
          targetLanguagesByProfile.get(row.profile.id),
        ),
      }),
    ]),
  );

  return profileIds
    .map((id) => byId.get(id))
    .filter((profile): profile is DiscoveryProfile => Boolean(profile));
};

export const upsertProfileForUser = async (
  userId: string,
  values: ProfileValues,
) => {
  const { targetLanguages, availability, ...profileValues } = values;
  const [primaryTarget] = targetLanguages;

  if (!primaryTarget) {
    throw new Error('Profile requires at least one target language.');
  }

  const writableProfileValues = {
    ...profileValues,
    ...toAvailabilityColumns(availability),
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

export const bumpProfileForUser = async (
  userId: string,
  bumpedAt = new Date(),
) => {
  const [profile] = await db
    .update(profiles)
    .set({ lastBumpedAt: bumpedAt })
    .where(eq(profiles.userId, userId))
    .returning();

  return profile ?? null;
};

export const mapProfileToDiscoveryProfile = toDiscoveryProfile;
export const mapProfileAvailability = toAvailabilityPattern;

import 'server-only';

import { and, count, eq, gte } from 'drizzle-orm';
import { db } from './client';
import {
  type ProfileInteractionKind,
  profileInteractions,
  profiles,
  savedProfiles,
} from './schema';

export type ProfileStats = {
  views30d: number;
  copies30d: number;
  saves: number;
};

const DAYS_30_MS = 30 * 24 * 60 * 60 * 1000;

export const recordProfileInteraction = async (
  ownerUserId: string,
  kind: ProfileInteractionKind,
) => {
  await db.insert(profileInteractions).values({ ownerUserId, kind });
};

export const getProfileStatsForUser = async (
  userId: string,
  profileId: string,
): Promise<ProfileStats> => {
  const since = new Date(Date.now() - DAYS_30_MS);
  const received = (kind: ProfileInteractionKind) =>
    db
      .select({ value: count() })
      .from(profileInteractions)
      .where(
        and(
          eq(profileInteractions.ownerUserId, userId),
          eq(profileInteractions.kind, kind),
          gte(profileInteractions.createdAt, since),
        ),
      );

  const [[views], [copies], [saves]] = await Promise.all([
    received('view'),
    received('copy'),
    db
      .select({ value: count() })
      .from(savedProfiles)
      .innerJoin(profiles, eq(savedProfiles.profileId, profiles.id))
      .where(eq(profiles.id, profileId)),
  ]);

  return {
    views30d: views?.value ?? 0,
    copies30d: copies?.value ?? 0,
    saves: saves?.value ?? 0,
  };
};

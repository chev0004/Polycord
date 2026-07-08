import 'server-only';

import { and, count, eq, gte, sql } from 'drizzle-orm';
import { db } from './client';
import {
  analyticsEvents,
  notifications,
  profiles,
  savedProfiles,
} from './schema';

export type ProfileStats = {
  views30d: number;
  copies30d: number;
  saves: number;
};

const DAYS_30_MS = 30 * 24 * 60 * 60 * 1000;

export const getProfileStatsForUser = async (
  userId: string,
  profileId: string,
): Promise<ProfileStats> => {
  const since = new Date(Date.now() - DAYS_30_MS);

  const [[views], [copies], [saves]] = await Promise.all([
    db
      .select({ value: count() })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.name, 'profile.view'),
          gte(analyticsEvents.createdAt, since),
          sql`${analyticsEvents.metadata} ->> 'ownerUserId' = ${userId}`,
        ),
      ),
    db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.kind, 'copy'),
          gte(notifications.createdAt, since),
        ),
      ),
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

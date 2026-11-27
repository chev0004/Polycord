import 'server-only';

import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  isNotNull,
  type SQL,
  sql,
} from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { db } from './client';
import { publiclyVisible } from './profiles';
import { profiles, profileTargetLanguages, users } from './schema';

export const AUDIENCE_MIN_GROUP = 25;

export type AudienceGroup = { code: string; share: number };

export type AudienceTotals = {
  profiles: number;
  active: number;
  speak: AudienceGroup[];
  learn: AudienceGroup[];
  countries: AudienceGroup[];
};

const counted = () =>
  and(publiclyVisible(), eq(users.isSynthetic, false)) as SQL;

const roundDown = (value: number) => Math.floor(value / 10) * 10;

const topGroups = async (column: PgColumn, total: number) => {
  const size = countDistinct(profiles.id);
  const rows = await db
    .select({ code: sql<string>`${column}`, size })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .leftJoin(
      profileTargetLanguages,
      eq(profileTargetLanguages.profileId, profiles.id),
    )
    .where(and(counted(), isNotNull(column)))
    .groupBy(column)
    .having(gte(size, AUDIENCE_MIN_GROUP))
    .orderBy(desc(size))
    .limit(5);
  return rows.map(({ code, size }) => ({
    code,
    share: Math.round((size / total) * 100),
  }));
};

export const getAudienceTotals = async (): Promise<AudienceTotals | null> => {
  const [totals] = await db
    .select({
      profiles: count(),
      active: count(
        sql`case when ${profiles.lastBumpedAt} > now() - interval '30 days' then 1 end`,
      ),
    })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .where(counted());
  if (totals.profiles < AUDIENCE_MIN_GROUP) return null;
  const [speak, learn, countries] = await Promise.all([
    topGroups(profiles.primaryLanguage, totals.profiles),
    topGroups(profileTargetLanguages.language, totals.profiles),
    topGroups(profiles.country, totals.profiles),
  ]);
  return {
    profiles: roundDown(totals.profiles),
    active: totals.active < AUDIENCE_MIN_GROUP ? 0 : roundDown(totals.active),
    speak,
    learn,
    countries,
  };
};

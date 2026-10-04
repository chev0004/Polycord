import 'server-only';

import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  sql,
} from 'drizzle-orm';
import { db } from './client';
import {
  ipBans,
  ipObservations,
  moderationRestrictions,
  users,
} from './schema';

const OBSERVATION_RETENTION_DAYS = 30;

export const recordIpObservation = async (
  discordUserId: string,
  ip: string,
) => {
  await db
    .insert(ipObservations)
    .values({ discordUserId, ip })
    .onConflictDoUpdate({
      target: [ipObservations.discordUserId, ipObservations.ip],
      set: { lastSeenAt: new Date() },
    });
  await db
    .delete(ipObservations)
    .where(
      lt(
        ipObservations.lastSeenAt,
        new Date(Date.now() - OBSERVATION_RETENTION_DAYS * 86_400_000),
      ),
    );
};

export const listIpObservations = (discordUserId: string) =>
  db
    .select()
    .from(ipObservations)
    .where(eq(ipObservations.discordUserId, discordUserId))
    .orderBy(desc(ipObservations.lastSeenAt));

export const findActiveIpBan = async (ip: string) => {
  const [ban] = await db
    .select()
    .from(ipBans)
    .where(and(eq(ipBans.ip, ip), isNull(ipBans.revokedAt)))
    .orderBy(asc(ipBans.createdAt))
    .limit(1);
  return ban ?? null;
};

export const findBannedAt = async (discordUserIds: string[]) => {
  if (!discordUserIds.length) return null;
  const [fromUsers, fromRestrictions] = await Promise.all([
    db
      .select({ at: users.bannedAt })
      .from(users)
      .where(
        and(
          inArray(users.discordUserId, discordUserIds),
          isNotNull(users.bannedAt),
        ),
      ),
    db
      .select({ at: moderationRestrictions.bannedAt })
      .from(moderationRestrictions)
      .where(
        and(
          inArray(moderationRestrictions.discordUserId, discordUserIds),
          isNotNull(moderationRestrictions.bannedAt),
        ),
      ),
  ]);
  const dates = [...fromUsers, ...fromRestrictions].flatMap(({ at }) =>
    at ? [at] : [],
  );
  return dates.length ? new Date(Math.min(...dates.map(Number))) : null;
};

export const listActiveIpBans = () =>
  db
    .select()
    .from(ipBans)
    .where(isNull(ipBans.revokedAt))
    .orderBy(desc(ipBans.createdAt));

export const addIpBan = async (values: {
  ip: string;
  reason?: string | null;
  targetDiscordUserId?: string | null;
  createdBy: string;
}) => {
  const [ban] = await db
    .insert(ipBans)
    .values({
      ip: values.ip,
      reason: values.reason?.trim() || null,
      targetDiscordUserId: values.targetDiscordUserId ?? null,
      createdBy: values.createdBy,
    })
    .returning();
  return ban;
};

export const revokeIpBan = async (id: string, revokedBy: string) => {
  const [ban] = await db
    .update(ipBans)
    .set({ revokedAt: sql`now()`, revokedBy })
    .where(and(eq(ipBans.id, id), isNull(ipBans.revokedAt)))
    .returning();
  return ban ?? null;
};

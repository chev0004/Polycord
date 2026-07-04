import 'server-only';

import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from './client';
import {
  type NewSuspiciousActivity,
  rateLimitCounters,
  suspiciousActivity,
} from './schema';

export type RateLimitResult = {
  allowed: boolean;
  retryAfterMs: number;
};

const retryAfter = (windowStart: Date, windowMs: number, now: Date) =>
  Math.max(0, windowStart.getTime() + windowMs - now.getTime());

export const consumeRateLimit = async (
  scope: string,
  subject: string,
  max: number,
  windowMs: number,
): Promise<RateLimitResult> => {
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowMs).toISOString();
  const nowIso = now.toISOString();

  const [row] = await db
    .insert(rateLimitCounters)
    .values({ scope, subject, windowStart: now, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimitCounters.scope, rateLimitCounters.subject],
      set: {
        count: sql`case when ${rateLimitCounters.windowStart} <= ${cutoff} then 1 else ${rateLimitCounters.count} + 1 end`,
        windowStart: sql`case when ${rateLimitCounters.windowStart} <= ${cutoff} then ${nowIso} else ${rateLimitCounters.windowStart} end`,
      },
    })
    .returning();

  return {
    allowed: row.count <= max,
    retryAfterMs:
      row.count <= max ? 0 : retryAfter(row.windowStart, windowMs, now),
  };
};

export const peekRateLimit = async (
  scope: string,
  subject: string,
  max: number,
  windowMs: number,
): Promise<RateLimitResult> => {
  const now = new Date();
  const [row] = await db
    .select()
    .from(rateLimitCounters)
    .where(
      and(
        eq(rateLimitCounters.scope, scope),
        eq(rateLimitCounters.subject, subject),
      ),
    );

  if (!row || row.windowStart.getTime() <= now.getTime() - windowMs) {
    return { allowed: true, retryAfterMs: 0 };
  }

  return {
    allowed: row.count < max,
    retryAfterMs:
      row.count < max ? 0 : retryAfter(row.windowStart, windowMs, now),
  };
};

export const logSuspiciousActivity = async (
  entry: NewSuspiciousActivity,
): Promise<void> => {
  await db.insert(suspiciousActivity).values(entry);
};

export const listSuspiciousActivity = async (limit = 100) =>
  db
    .select()
    .from(suspiciousActivity)
    .orderBy(desc(suspiciousActivity.createdAt))
    .limit(limit);

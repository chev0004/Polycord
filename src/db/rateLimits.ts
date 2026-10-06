import 'server-only';

import { and, desc, eq, getTableColumns, sql } from 'drizzle-orm';
import { ACTIVITY_PAGE_SIZE, type ActivityWindow } from '@/lib/activityWindow';
import { afterCursor, cursorAt, withinWindow } from './activityWindow';
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

const flaggedKey = sql`coalesce(${suspiciousActivity.userId}::text, ${suspiciousActivity.id}::text)`;

export const listSuspiciousGroups = async (window: ActivityWindow) => {
  const ranked = db
    .select({
      ...getTableColumns(suspiciousActivity),
      cursorAt: cursorAt(suspiciousActivity.createdAt).as('cursor_at'),
      total: sql<number>`count(*) over (partition by ${flaggedKey})`
        .mapWith(Number)
        .as('total'),
      position:
        sql<number>`row_number() over (partition by ${flaggedKey} order by ${suspiciousActivity.createdAt} desc, ${suspiciousActivity.id} desc)`
          .mapWith(Number)
          .as('position'),
    })
    .from(suspiciousActivity)
    .where(withinWindow(suspiciousActivity.createdAt, window))
    .as('ranked');

  return db
    .select()
    .from(ranked)
    .where(
      and(
        eq(ranked.position, 1),
        afterCursor(ranked.createdAt, ranked.id, window.cursor),
      ),
    )
    .orderBy(desc(ranked.createdAt), desc(ranked.id))
    .limit(ACTIVITY_PAGE_SIZE + 1);
};

export const listSuspiciousEvents = async (
  userId: string,
  window: ActivityWindow,
  offset = 0,
  limit = 50,
) => {
  const rows = await db
    .select()
    .from(suspiciousActivity)
    .where(
      and(
        eq(suspiciousActivity.userId, userId),
        withinWindow(suspiciousActivity.createdAt, window),
      ),
    )
    .orderBy(desc(suspiciousActivity.createdAt), desc(suspiciousActivity.id))
    .limit(limit + 1)
    .offset(offset);
  return { events: rows.slice(0, limit), hasMore: rows.length > limit };
};

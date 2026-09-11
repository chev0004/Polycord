import 'server-only';

import { count, countDistinct, desc, gte, sql } from 'drizzle-orm';
import { db } from './client';
import { analyticsEvents, type NewAnalyticsEvent } from './schema';

const daysAgo = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000);

export const insertAnalyticsEvent = async (event: NewAnalyticsEvent) => {
  await db.insert(analyticsEvents).values(event);
};

export const getAnalyticsTotals = async (sinceDays = 30) => {
  const [row] = await db
    .select({
      totalEvents: count(),
      uniqueUsers: countDistinct(analyticsEvents.userId),
    })
    .from(analyticsEvents)
    .where(gte(analyticsEvents.createdAt, daysAgo(sinceDays)));

  return {
    totalEvents: row?.totalEvents ?? 0,
    uniqueUsers: row?.uniqueUsers ?? 0,
  };
};

export const getAnalyticsEventCounts = async (sinceDays = 30) => {
  const rows = await db
    .select({ name: analyticsEvents.name, total: count() })
    .from(analyticsEvents)
    .where(gte(analyticsEvents.createdAt, daysAgo(sinceDays)))
    .groupBy(analyticsEvents.name)
    .orderBy(desc(count()));

  return rows;
};

export const getRecentAnalyticsEvents = async (limit = 25) => {
  return db
    .select({
      id: analyticsEvents.id,
      name: analyticsEvents.name,
      userId: analyticsEvents.userId,
      locale: analyticsEvents.locale,
      metadata: analyticsEvents.metadata,
      createdAt: analyticsEvents.createdAt,
    })
    .from(analyticsEvents)
    .orderBy(desc(analyticsEvents.createdAt))
    .limit(limit);
};

export const getDailyAnalyticsTotals = async (sinceDays = 14) => {
  const day = sql<string>`date_trunc('day', ${analyticsEvents.createdAt})`;

  const rows = await db
    .select({ day, total: count() })
    .from(analyticsEvents)
    .where(gte(analyticsEvents.createdAt, daysAgo(sinceDays)))
    .groupBy(day)
    .orderBy(day);

  return rows.map((row) => ({
    date: new Date(row.day).toISOString().slice(0, 10),
    total: row.total,
  }));
};

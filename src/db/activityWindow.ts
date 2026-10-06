import { type AnyColumn, and, eq, gte, lt, or, sql } from 'drizzle-orm';
import type { ActivityWindow } from '@/lib/activityWindow';

export const cursorAt = (column: AnyColumn) =>
  sql<string>`to_char(${column} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

export const withinWindow = (
  createdAt: AnyColumn,
  { from, to }: ActivityWindow,
) => and(gte(createdAt, from), lt(createdAt, to));

export const afterCursor = (
  createdAt: AnyColumn,
  id: AnyColumn,
  cursor: ActivityWindow['cursor'],
) =>
  cursor
    ? or(
        lt(createdAt, sql`${cursor.at}::timestamptz`),
        and(eq(createdAt, sql`${cursor.at}::timestamptz`), lt(id, cursor.id)),
      )
    : undefined;

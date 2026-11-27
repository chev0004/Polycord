import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  gt,
  lt,
  lte,
  sql,
} from 'drizzle-orm';
import { SPONSOR_LIMITS } from '@/constants/sponsors';
import { db } from './client';
import { type NewSponsor, sponsors } from './schema';

const { image, phoneImage, imageType, phoneImageType, ...listColumns } =
  getTableColumns(sponsors);

const live = () =>
  and(
    eq(sponsors.paused, false),
    lte(sponsors.startsAt, sql`now()`),
    gt(sponsors.endsAt, sql`now()`),
  );

export const listLiveSponsors = () =>
  db
    .select({
      id: sponsors.id,
      tier: sponsors.tier,
      url: sponsors.url,
      altEn: sponsors.altEn,
      altJa: sponsors.altJa,
    })
    .from(sponsors)
    .where(live())
    .orderBy(asc(sponsors.startsAt));

export const listSponsors = () =>
  db
    .select(listColumns)
    .from(sponsors)
    .orderBy(asc(sponsors.tier), desc(sponsors.startsAt));

export type SponsorRow = Awaited<ReturnType<typeof listSponsors>>[number];

export const createSponsor = async (values: NewSponsor) => {
  const [{ booked }] = await db
    .select({ booked: count() })
    .from(sponsors)
    .where(
      and(
        eq(sponsors.tier, values.tier),
        lt(sponsors.startsAt, values.endsAt),
        gt(sponsors.endsAt, values.startsAt),
      ),
    );
  if (booked >= SPONSOR_LIMITS[values.tier]) return null;
  const [row] = await db.insert(sponsors).values(values).returning(listColumns);
  return row;
};

export const setSponsorPaused = async (id: string, paused: boolean) => {
  const [row] = await db
    .update(sponsors)
    .set({ paused })
    .where(eq(sponsors.id, id))
    .returning(listColumns);
  return row ?? null;
};

export const deleteSponsor = async (id: string) => {
  const [row] = await db
    .delete(sponsors)
    .where(eq(sponsors.id, id))
    .returning({ id: sponsors.id });
  return Boolean(row);
};

export const getSponsorImage = async (id: string, phone: boolean) => {
  const [row] = await db
    .select(
      phone
        ? { data: phoneImage, type: phoneImageType }
        : { data: image, type: imageType },
    )
    .from(sponsors)
    .where(eq(sponsors.id, id))
    .limit(1);
  return row?.data && row.type ? { data: row.data, type: row.type } : null;
};

export const recordSponsorEvent = (id: string, event: 'view' | 'click') =>
  db
    .update(sponsors)
    .set(
      event === 'view'
        ? { views: sql`${sponsors.views} + 1` }
        : { clicks: sql`${sponsors.clicks} + 1` },
    )
    .where(and(eq(sponsors.id, id), live()));

import 'server-only';

import { and, count, eq, inArray, or, type SQL, sql } from 'drizzle-orm';
import type { DiscoveryTagCount } from '@/features/Discovery/discoveryTags';
import type { DiscoveryUrlState } from '@/features/Discovery/discoveryUrlState';
import { db } from './client';
import { discoveryAvailability } from './discoveryAvailability';
import { discoverySearch } from './discoverySearch';
import {
  mapDiscoveryProfiles,
  publiclyVisible,
  type ViewerAvailabilityContext,
} from './profiles';
import { profiles, savedProfiles, subscriptions, users } from './schema';

export const DISCOVERY_PAGE_SIZE = 9;

let postgresTimezones: Promise<string[]> | undefined;

const loadPostgresTimezones = () => {
  postgresTimezones ??= db
    .execute<{ name: string }>(sql`select name from pg_timezone_names`)
    .then((rows) => [...rows].map(({ name }) => name));
  return postgresTimezones;
};

export const listDiscoveryPage = async (
  state: DiscoveryUrlState,
  locale: string,
  viewer: ViewerAvailabilityContext,
  viewerUserId?: string,
  stacked = false,
) => {
  const visible = and(
    publiclyVisible(),
    viewerUserId
      ? sql`not exists (
    select 1 from user_blocks where
      (blocker_user_id = ${viewerUserId}::uuid and blocked_user_id = ${profiles.userId}) or
      (blocked_user_id = ${viewerUserId}::uuid and blocker_user_id = ${profiles.userId})
  )`
      : undefined,
  );
  const conditions: (SQL | undefined)[] = [visible];
  const selection = (key: string) => {
    const value = state.filterValues[key];
    return Array.isArray(value) ? value : value ? [value] : [];
  };
  const targetMatch = (
    column: 'language' | 'proficiency_level',
    values: string[],
  ) => sql`exists (
    select 1 from profile_target_languages where profile_id = ${profiles.id} and ${sql.identifier(column)}::text in (${sql.join(
      values.map((value) => sql`${value}`),
      sql`,`,
    )})
  ) or (not exists (select 1 from profile_target_languages where profile_id = ${profiles.id}) and
    ${column === 'language' ? profiles.targetLanguage : profiles.proficiencyLevel}::text in (${sql.join(
      values.map((value) => sql`${value}`),
      sql`,`,
    )}))`;
  for (const [key, column] of [
    ['primaryLanguage', profiles.primaryLanguage],
    ['country', profiles.country],
    ['timezone', profiles.timezone],
  ] as const) {
    const values = selection(key);
    if (values.length) conditions.push(inArray(column, values));
  }
  if (selection('timezone').length)
    conditions.push(eq(profiles.displayTimezone, true));
  if (selection('targetLanguage').length)
    conditions.push(
      sql`(${targetMatch('language', selection('targetLanguage'))})`,
    );
  if (selection('proficiency').length)
    conditions.push(
      sql`(${targetMatch('proficiency_level', selection('proficiency'))})`,
    );
  if (state.selectedTags.length)
    conditions.push(
      sql`${profiles.tags} @> array[${sql.join(
        state.selectedTags.map((tag) => sql`${tag}`),
        sql`,`,
      )}]::text[]`,
    );

  const query = state.searchQuery.trim().toLowerCase();
  if (query)
    conditions.push(discoverySearch(query, locale, Boolean(viewerUserId)));
  const availability = discoveryAvailability(
    viewer,
    await loadPostgresTimezones(),
  );
  if (selection('availability')[0] === 'available-now')
    conditions.push(availability.availableNow);
  if (selection('availability')[0] === 'overlaps')
    conditions.push(sql`${availability.overlap} >= 30`);
  const premiumIds = (process.env.POLYCORD_PREMIUM_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const premium = or(
    premiumIds.length ? inArray(users.discordUserId, premiumIds) : undefined,
    sql`(${subscriptions.status} in ('active', 'trialing') and ${subscriptions.currentPeriodEnd} > now())`,
  );
  const bumpAge = sql`case when ${profiles.lastBumpedAt} is not null then greatest(0, floor(extract(epoch from (now() - ${profiles.lastBumpedAt})) / 60)) end`;
  const bumped = sql`${bumpAge} asc nulls last`;
  const name = sql`${users.displayName} asc, ${profiles.id} asc`;
  const order = {
    'bumped-desc': sql`coalesce((${premium}) and ${profiles.boostedUntil} > now(), false) desc, ${bumped}, ${name}`,
    'bumped-asc': sql`${bumpAge} desc nulls first, ${name}`,
    'name-asc': name,
    'name-desc': sql`${users.displayName} desc, ${profiles.id} asc`,
    'overlap-desc': sql`${availability.overlap} desc, ${bumped}, ${name}`,
  }[state.sortValue];
  const where = and(...conditions);
  const [[summary], tags] = await Promise.all([
    db
      .select({ total: count() })
      .from(profiles)
      .innerJoin(users, eq(profiles.userId, users.id))
      .where(where),
    db.execute<DiscoveryTagCount>(sql`select tag, count(*)::int as count from ${profiles}
      inner join ${users} on ${profiles.userId} = ${users.id}
      cross join lateral unnest(${profiles.tags}) tag where ${visible}
      group by tag order by count(*) desc, tag limit 32`),
  ]);
  const page = Math.min(
    state.page,
    Math.max(1, Math.ceil(summary.total / DISCOVERY_PAGE_SIZE)),
  );
  const rows = await db
    .select({ profile: profiles, user: users, subscription: subscriptions })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .leftJoin(subscriptions, eq(profiles.userId, subscriptions.userId))
    .where(where)
    .orderBy(order)
    .limit(DISCOVERY_PAGE_SIZE * (stacked ? page : 1))
    .offset(stacked ? 0 : (page - 1) * DISCOVERY_PAGE_SIZE);
  const profileIds = rows.map((row) => row.profile.id);
  const [items, saved] = await Promise.all([
    mapDiscoveryProfiles(rows, Boolean(viewerUserId)),
    viewerUserId && profileIds.length
      ? db
          .select({ id: savedProfiles.profileId })
          .from(savedProfiles)
          .where(
            and(
              eq(savedProfiles.userId, viewerUserId),
              inArray(savedProfiles.profileId, profileIds),
            ),
          )
      : [],
  ]);
  return {
    profiles: items,
    total: summary.total,
    page,
    tags: [...tags],
    savedProfileIds: saved.map((row) => row.id),
  };
};

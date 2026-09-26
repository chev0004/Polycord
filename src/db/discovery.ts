import 'server-only';

import { and, count, eq, inArray, or, type SQL, sql } from 'drizzle-orm';
import type { DiscoveryTagCount } from '@/features/Discovery/discoveryTags';
import {
  type DiscoveryUrlState,
  MAX_STACK_PAGES,
} from '@/features/Discovery/discoveryUrlState';
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

const TOP_TAGS = 32;
const TAG_CACHE_SIZE = 64;
const TAG_CACHE_MS = 60000;

let postgresTimezones: Promise<string[]> | undefined;

const loadPostgresTimezones = () => {
  if (!postgresTimezones) {
    const timezones = db
      .execute<{ name: string }>(sql`select name from pg_timezone_names`)
      .then((rows) => [...rows].map(({ name }) => name));
    postgresTimezones = timezones;
    timezones.catch(() => {
      if (postgresTimezones === timezones) postgresTimezones = undefined;
    });
  }
  return postgresTimezones;
};

let tagCache:
  | { expires: number; tags: Promise<DiscoveryTagCount[]> }
  | undefined;

const tagCounts = (where: SQL | undefined, limit?: number) =>
  db
    .execute<DiscoveryTagCount>(sql`select tag, count(*)::int as count from ${profiles}
      inner join ${users} on ${profiles.userId} = ${users.id}
      cross join lateral unnest(${profiles.tags}) tag where ${where}
      group by tag order by count(*) desc, tag ${limit ? sql`limit ${limit}` : sql``}`)
    .then((rows) => [...rows]);

const loadTopTags = () => {
  if (!tagCache || tagCache.expires < Date.now()) {
    const tags = tagCounts(publiclyVisible(), TAG_CACHE_SIZE);
    tagCache = { expires: Date.now() + TAG_CACHE_MS, tags };
    const forget = () => {
      if (tagCache?.tags === tags) tagCache = undefined;
    };
    tags.then((loaded) => {
      if (!loaded.length) forget();
    }, forget);
  }
  return tagCache.tags;
};

const blockedUserIds = (viewerUserId: string) =>
  sql`(select blocked_user_id from user_blocks where blocker_user_id = ${viewerUserId}::uuid
    union all select blocker_user_id from user_blocks where blocked_user_id = ${viewerUserId}::uuid)`;

const listTopTags = async (viewerUserId?: string) => {
  const [top, blocked] = await Promise.all([
    loadTopTags(),
    viewerUserId
      ? tagCounts(
          and(
            publiclyVisible(),
            sql`${profiles.userId} in ${blockedUserIds(viewerUserId)}`,
          ),
        )
      : [],
  ]);
  if (!blocked.length) return top.slice(0, TOP_TAGS);
  const hidden = new Map(blocked.map(({ tag, count }) => [tag, count]));
  return top
    .map(({ tag, count }) => ({ tag, count: count - (hidden.get(tag) ?? 0) }))
    .filter(({ count }) => count > 0)
    .sort(
      (a, b) =>
        b.count - a.count || (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0),
    )
    .slice(0, TOP_TAGS);
};

const discoveryWhere = async (
  state: DiscoveryUrlState,
  locale: string,
  viewer: ViewerAvailabilityContext,
  viewerUserId?: string,
) => {
  const conditions: (SQL | undefined)[] = [
    publiclyVisible(),
    viewerUserId
      ? sql`not exists (select 1 from user_blocks where blocker_user_id = ${viewerUserId}::uuid and blocked_user_id = ${profiles.userId})
        and not exists (select 1 from user_blocks where blocked_user_id = ${viewerUserId}::uuid and blocker_user_id = ${profiles.userId})`
      : undefined,
  ];
  const selection = (key: string) => {
    const value = state.filterValues[key];
    return Array.isArray(value) ? value : value ? [value] : [];
  };
  const targetMatch = (
    column: 'language' | 'proficiency_level',
    values: string[],
  ) => {
    const list = sql.join(
      values.map((value) => sql`${value}`),
      sql`,`,
    );
    return sql`${profiles.id} in (
    select profile_id from profile_target_languages where ${sql.identifier(column)}::text in (${list})
  ) or (not exists (select 1 from profile_target_languages where profile_id = ${profiles.id}) and
    ${column === 'language' ? profiles.targetLanguage : profiles.proficiencyLevel}::text in (${list}))`;
  };
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
  return { where: and(...conditions), overlap: availability.overlap };
};

export const countDiscovery = async (
  state: DiscoveryUrlState,
  locale: string,
  viewer: ViewerAvailabilityContext,
  viewerUserId?: string,
) => {
  const { where } = await discoveryWhere(state, locale, viewer, viewerUserId);
  const [summary] = await db
    .select({ total: count() })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .where(where);
  return summary.total;
};

export const listDiscoveryPage = async (
  state: DiscoveryUrlState,
  locale: string,
  viewer: ViewerAvailabilityContext,
  viewerUserId?: string,
  stacked = false,
) => {
  const { where, overlap } = await discoveryWhere(
    state,
    locale,
    viewer,
    viewerUserId,
  );
  const premiumIds = (process.env.POLYCORD_PREMIUM_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const premium = or(
    premiumIds.length ? inArray(users.discordUserId, premiumIds) : undefined,
    sql`(${subscriptions.status} in ('active', 'trialing') and ${subscriptions.currentPeriodEnd} > now())`,
  );
  const bumped = sql`${profiles.lastBumpedAt} desc nulls last, ${users.displayName} asc, ${profiles.id} asc`;
  const name = sql`${users.displayName} asc, ${profiles.id} asc`;
  const order = {
    'bumped-desc': bumped,
    'bumped-asc': sql`${profiles.lastBumpedAt} asc nulls first, ${name}`,
    'name-asc': name,
    'name-desc': sql`${users.displayName} desc, ${profiles.id} asc`,
    'overlap-desc': sql`${overlap} desc, ${bumped}`,
  }[state.sortValue];
  const boosted = sql`${profiles.boostedUntil} > now() and (${premium})`;

  const selectRows = (condition: SQL | undefined, limit: number, offset = 0) =>
    db
      .select({ profile: profiles, user: users, subscription: subscriptions })
      .from(profiles)
      .innerJoin(users, eq(profiles.userId, users.id))
      .leftJoin(subscriptions, eq(profiles.userId, subscriptions.userId))
      .where(condition)
      .orderBy(order)
      .limit(limit)
      .offset(offset);

  const searchPage = async (limit: number, offset: number) => {
    const matches = await db
      .select({
        id: profiles.id,
        total: sql<number>`count(*) over ()`.mapWith(Number),
      })
      .from(profiles)
      .innerJoin(users, eq(profiles.userId, users.id))
      .leftJoin(subscriptions, eq(profiles.userId, subscriptions.userId))
      .where(where)
      .orderBy(
        state.sortValue === 'bumped-desc'
          ? sql`coalesce(${boosted}, false) desc, ${order}`
          : order,
      )
      .limit(limit)
      .offset(offset);
    if (!matches.length) return { rows: [], total: await countRows() };
    const ids = matches.map((match) => match.id);
    const found = await selectRows(inArray(profiles.id, ids), ids.length);
    const byId = new Map(found.map((row) => [row.profile.id, row]));
    return {
      rows: ids.flatMap((id) => byId.get(id) ?? []),
      total: matches[0].total,
    };
  };

  const countRows = () =>
    db
      .select({ total: count() })
      .from(profiles)
      .innerJoin(users, eq(profiles.userId, users.id))
      .where(where)
      .then(([summary]) => summary.total);

  const pageRows = async (limit: number, offset: number) => {
    if (state.sortValue !== 'bumped-desc')
      return selectRows(where, limit, offset);
    const top = await selectRows(and(where, boosted), offset + limit);
    if (top.length === offset + limit) return top.slice(offset);
    const rest = await selectRows(
      and(where, sql`not coalesce(${boosted}, false)`),
      limit - Math.max(0, top.length - offset),
      Math.max(0, offset - top.length),
    );
    return [...top.slice(offset), ...rest];
  };

  const loadPage = async (page: number) => {
    const limit = DISCOVERY_PAGE_SIZE * (stacked ? page : 1);
    const offset = stacked ? 0 : (page - 1) * DISCOVERY_PAGE_SIZE;
    if (state.searchQuery.trim()) return searchPage(limit, offset);
    const [total, rows] = await Promise.all([
      countRows(),
      pageRows(limit, offset),
    ]);
    return { rows, total };
  };

  const requestedPage = stacked
    ? Math.min(state.page, MAX_STACK_PAGES)
    : state.page;
  const [tags, requested] = await Promise.all([
    listTopTags(viewerUserId),
    loadPage(requestedPage),
  ]);
  const page = Math.min(
    requestedPage,
    Math.max(1, Math.ceil(requested.total / DISCOVERY_PAGE_SIZE)),
  );
  const { rows, total } =
    page === requestedPage ? requested : await loadPage(page);
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
    total,
    page,
    tags,
    savedProfileIds: saved.map((row) => row.id),
  };
};

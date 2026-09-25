import { and, sql } from 'drizzle-orm';
import {
  formatTimezone,
  getLanguageName,
  languages,
  proficiencyOptions,
} from '@/constants/languages';
import { profiles, users } from './schema';

const MIN_INDEXED_TOKEN = 3;
const MAX_INDEXED_TOKENS = 3;

let timezoneLabels:
  | { hour: number; labels: Record<string, string>; json: string }
  | undefined;

const loadTimezoneLabels = () => {
  const hour = Math.floor(Date.now() / 3600000);
  if (timezoneLabels?.hour !== hour) {
    const labels = Object.fromEntries(
      [...Intl.supportedValuesOf('timeZone'), 'UTC'].map((zone) => [
        zone,
        formatTimezone(zone),
      ]),
    );
    timezoneLabels = { hour, labels, json: JSON.stringify(labels) };
  }
  return timezoneLabels;
};

const valueList = (values: string[]) =>
  values.length
    ? sql.join(
        values.map((value) => sql`${value}`),
        sql`,`,
      )
    : sql`null`;

const tokenMatches = (token: string, locale: string, isLoggedIn: boolean) => {
  const pattern = `%${token.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
  const matches = (value: string) => value.toLowerCase().includes(token);
  const codes = valueList(
    languages
      .map((language) => language.code)
      .filter((code) => matches(getLanguageName(code, locale))),
  );
  const levels = valueList(
    proficiencyOptions(locale)
      .filter((level) => matches(level.label))
      .map((level) => level.value),
  );
  const zones = valueList(
    Object.entries(loadTimezoneLabels().labels)
      .filter(([, label]) => matches(label))
      .map(([zone]) => zone),
  );

  return sql`${profiles.id} in (
    select id from profiles
      where discovery_profile_text(bio, country, tags, display_timezone, timezone) like ${pattern}
    union all
    select id from profiles where primary_language in (${codes})
    union all
    select id from profiles where display_timezone and timezone in (${zones})
    union all
    select matched.id from users cross join lateral (
      select id from profiles where user_id = users.id limit 1
    ) matched where lower(users.display_name) like ${pattern}
    union all
    select matched.id from users cross join lateral (
      select id from profiles where user_id = users.id
        ${isLoggedIn ? sql`` : sql`and allow_anonymous_copy`} limit 1
    ) matched where lower(users.discord_username) like ${pattern}
    union all
    select profile_id from profile_target_languages
      where language in (${codes}) or proficiency_level::text in (${levels})
    union all
    select id from profiles
      where (target_language in (${codes}) or proficiency_level::text in (${levels}))
        and not exists (select 1 from profile_target_languages where profile_id = profiles.id)
  )`;
};

const exactMatch = (query: string, locale: string, isLoggedIn: boolean) => {
  const { json: timezoneJson } = loadTimezoneLabels();
  const languageLabels = JSON.stringify(
    Object.fromEntries(
      languages.map((language) => [
        language.code,
        getLanguageName(language.code, locale),
      ]),
    ),
  );
  const levelLabels = JSON.stringify(
    Object.fromEntries(
      proficiencyOptions(locale).map((level) => [level.value, level.label]),
    ),
  );
  const primary = sql`coalesce(${languageLabels}::jsonb ->> ${profiles.primaryLanguage}, ${profiles.primaryLanguage})`;
  const targets = sql`coalesce((select string_agg(concat_ws(' ',
    coalesce(${languageLabels}::jsonb ->> language, language),
    coalesce(${levelLabels}::jsonb ->> proficiency_level::text, proficiency_level::text)), ' ' order by position)
    from profile_target_languages where profile_id = ${profiles.id}),
    concat_ws(' ', coalesce(${languageLabels}::jsonb ->> ${profiles.targetLanguage}, ${profiles.targetLanguage}),
      coalesce(${levelLabels}::jsonb ->> ${profiles.proficiencyLevel}::text, ${profiles.proficiencyLevel}::text)))`;
  const timezone = sql`case when ${profiles.displayTimezone} then coalesce(${profiles.timezone}, '') else '' end`;
  const username = isLoggedIn
    ? users.discordUsername
    : sql`case when ${profiles.allowAnonymousCopy} then ${users.discordUsername} else '' end`;
  return sql`strpos(lower(concat_ws(' ', ${users.displayName}, ${username}, ${primary}, '',
    coalesce(${profiles.country}, ''), ${timezone}, coalesce(${timezoneJson}::jsonb ->> (${timezone}), ${timezone}),
    ${profiles.bio}, array_to_string(${profiles.tags}, ' '), ${targets})), ${query}) > 0`;
};

export const discoverySearch = (
  query: string,
  locale: string,
  isLoggedIn: boolean,
) => {
  const tokens = [...new Set(query.split(' ').filter(Boolean))];
  if (tokens.length === 1) return tokenMatches(tokens[0], locale, isLoggedIn);
  return and(
    ...tokens
      .filter((token) => token.length >= MIN_INDEXED_TOKEN)
      .sort((a, b) => b.length - a.length)
      .slice(0, MAX_INDEXED_TOKENS)
      .map((token) => tokenMatches(token, locale, isLoggedIn)),
    exactMatch(query, locale, isLoggedIn),
  );
};

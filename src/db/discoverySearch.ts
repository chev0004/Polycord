import { sql } from 'drizzle-orm';
import {
  formatTimezone,
  getLanguageName,
  languages,
  proficiencyOptions,
} from '@/constants/languages';
import { profiles, users } from './schema';

let timezoneLabels: { hour: number; json: string } | undefined;

export const discoverySearch = (query: string, locale: string) => {
  const hour = Math.floor(Date.now() / 3600000);
  if (timezoneLabels?.hour !== hour) {
    timezoneLabels = {
      hour,
      json: JSON.stringify(
        Object.fromEntries(
          [...Intl.supportedValuesOf('timeZone'), 'UTC'].map((zone) => [
            zone,
            formatTimezone(zone),
          ]),
        ),
      ),
    };
  }
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
  return sql`strpos(lower(concat_ws(' ', ${users.displayName}, ${users.discordUsername}, ${primary}, '',
    coalesce(${profiles.country}, ''), ${timezone}, coalesce(${timezoneLabels.json}::jsonb ->> (${timezone}), ${timezone}),
    ${profiles.bio}, array_to_string(${profiles.tags}, ' '), ${targets})), ${query}) > 0`;
};

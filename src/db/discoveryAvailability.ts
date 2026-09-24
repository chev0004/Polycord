import { sql } from 'drizzle-orm';
import { toUtcWeekIntervals } from '@/features/Discovery/availabilityOverlap';
import type { ViewerAvailabilityContext } from './profiles';
import { profiles } from './schema';

const minute = (
  column: typeof profiles.availabilityFrom | typeof profiles.availabilityTo,
) =>
  sql`(coalesce(split_part(${column}, ':', 1)::int, 0) * 60 + coalesce(split_part(${column}, ':', 2)::int, 0))`;

export const discoveryAvailability = (
  viewer: ViewerAvailabilityContext,
  timezones: string[],
) => {
  const intervals = toUtcWeekIntervals(viewer);
  const viewerRanges = `{${intervals.map(({ start, end }) => `[${start},${end})`).join(',')}}`;
  const ranges = sql`(select coalesce(range_agg(segment), '{}'::int4multirange) from (
    select int4range(start_minute, least(start_minute + duration, 10080)) as segment from windows
    union all
    select int4range(0, start_minute + duration - 10080) from windows where start_minute + duration > 10080
  ) segments)`;
  const weekly = sql`(with pattern as (
    select
      coalesce(${profiles.availabilityDays}, case ${profiles.availability} when 'weekends' then 'weekends' else 'weekdays' end) as days,
      case when ${profiles.availabilityDays} is not null then
        case when ${profiles.availabilityAnyTime} then 0 else ${minute(profiles.availabilityFrom)} end
        else case ${profiles.availability} when 'weeknights' then 1080 when 'weekends' then 600 else 360 end end as from_minute,
      case when ${profiles.availabilityDays} is not null then
        case when ${profiles.availabilityAnyTime} then 1440 else (${minute(profiles.availabilityTo)} - ${minute(profiles.availabilityFrom)} + 1440) % 1440 end
        else case ${profiles.availability} when 'weeknights' then 240 when 'weekends' then 480 else 180 end end as duration,
      extract(epoch from (now() at time zone ${profiles.timezone} - now() at time zone 'UTC'))::int / 60 as offset_minute
    where ${profiles.displayAvailability} and ${profiles.displayTimezone} and ${profiles.timezone} = any(string_to_array(${timezones.join(',')}, ','))
      and (${profiles.availabilityDays} is not null or ${profiles.availability} <> 'flexible')
  ), windows as (
    select ((day * 1440 + from_minute - offset_minute) % 10080 + 10080) % 10080 as start_minute, duration
    from pattern cross join generate_series(0, 6) day
    where days = 'any' or (days = 'weekdays' and day between 1 and 5) or (days = 'weekends' and day in (0, 6))
  ) select ${ranges})`;
  const now = new Date();
  const currentMinute =
    now.getUTCDay() * 1440 + now.getUTCHours() * 60 + now.getUTCMinutes();
  return {
    availableNow: sql`${weekly} @> ${currentMinute}::int`,
    overlap: sql`(select coalesce(sum(upper(value) - lower(value)), 0) from unnest(${weekly} * ${viewerRanges}::int4multirange) value)`,
  };
};

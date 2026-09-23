import type { Availability, TimeFormat } from './languages';

export type AvailabilityDays = 'any' | 'weekdays' | 'weekends';

export type AvailabilityPattern = {
  days: AvailabilityDays;
  from: string;
  to: string;
  anyTime?: boolean;
};

export const DEFAULT_AVAILABILITY_PATTERN: AvailabilityPattern = {
  days: 'any',
  from: '18:00',
  to: '22:00',
};

// Canonical structured shape for each legacy preset. Used to seed the editor
// from the stored enum until structured availability is persisted (DISC-007).
const PRESET_PATTERNS: Record<Availability, AvailabilityPattern> = {
  weeknights: { days: 'weekdays', from: '18:00', to: '22:00' },
  weekday_mornings: { days: 'weekdays', from: '06:00', to: '09:00' },
  weekends: { days: 'weekends', from: '10:00', to: '18:00' },
  flexible: { days: 'any', from: '18:00', to: '22:00', anyTime: true },
};

export const availabilityPresetToPattern = (
  preset: Availability,
): AvailabilityPattern => ({
  ...PRESET_PATTERNS[preset],
});

// Collapse the structured shape back to the persisted enum (lossy). Custom time
// ranges fall into the nearest preset bucket; weekday mornings split at noon.
export const availabilityPatternToPreset = (
  pattern: AvailabilityPattern | null | undefined,
): Availability => {
  if (!pattern || pattern.anyTime || pattern.days === 'any') {
    return 'flexible';
  }
  if (pattern.days === 'weekends') {
    return 'weekends';
  }
  const [fromHour] = pattern.from.split(':').map(Number);
  return fromHour < 12 ? 'weekday_mornings' : 'weeknights';
};

export const tzOffsetMinutes = (timezone: string): number => {
  try {
    const now = new Date();
    const local = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    return Math.round((local.getTime() - utc.getTime()) / 60000);
  } catch {
    return 0;
  }
};

export const parseHhMm = (value: string): number => {
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
};

export const convertTime = (
  time24: string,
  fromTz: string,
  toTz: string,
): { h: number; m: number } => {
  const totalMin =
    parseHhMm(time24) - tzOffsetMinutes(fromTz) + tzOffsetMinutes(toTz);
  return {
    h: ((Math.floor(totalMin / 60) % 24) + 24) % 24,
    m: ((totalMin % 60) + 60) % 60,
  };
};

export const fmtHour = (
  h: number,
  m: number,
  timeFormat: TimeFormat,
  locale: string,
): string =>
  new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: timeFormat === '12hr' ? 'h12' : 'h23',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2000, 0, 1, h, m)));

export const tzAbbr = (tz: string | undefined): string => {
  if (!tz) return '';
  try {
    const part = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName')?.value;
    return part || (tz.split('/').pop() ?? '');
  } catch {
    return tz.split('/').pop() ?? '';
  }
};

export type AvailabilityRowLabels = {
  days: Record<AvailabilityDays, string>;
  anyTime: string;
  to: string;
  viewerSuffix: string;
};

export type FormattedAvailability = {
  ownerStr: string;
  viewerStr: string | null;
};

export const formatAvailability = (
  pattern: AvailabilityPattern | null | undefined,
  ownerTimezone: string | undefined,
  viewerTimezone: string | undefined,
  labels: AvailabilityRowLabels,
  timeFormat: TimeFormat = '24hr',
  locale = 'en',
): FormattedAvailability | null => {
  if (!pattern) return null;

  const daysLabel = labels.days[pattern.days] ?? labels.days.any;

  if (pattern.anyTime) {
    return { ownerStr: `${daysLabel} · ${labels.anyTime}`, viewerStr: null };
  }

  if (!pattern.from || !pattern.to) return null;

  const [fromHour, fromMin] = pattern.from.split(':').map(Number);
  const [toHour, toMin] = pattern.to.split(':').map(Number);
  const abbr = tzAbbr(ownerTimezone);
  const ownerStr = `${daysLabel} · ${fmtHour(fromHour, fromMin, timeFormat, locale)} ${labels.to} ${fmtHour(toHour, toMin, timeFormat, locale)}${abbr ? ` ${abbr}` : ''}`;

  if (!ownerTimezone || !viewerTimezone || viewerTimezone === ownerTimezone) {
    return { ownerStr, viewerStr: null };
  }

  const viewerFrom = convertTime(pattern.from, ownerTimezone, viewerTimezone);
  const viewerTo = convertTime(pattern.to, ownerTimezone, viewerTimezone);
  return {
    ownerStr,
    viewerStr: `${fmtHour(viewerFrom.h, viewerFrom.m, timeFormat, locale)} ${labels.to} ${fmtHour(viewerTo.h, viewerTo.m, timeFormat, locale)} ${labels.viewerSuffix}`,
  };
};

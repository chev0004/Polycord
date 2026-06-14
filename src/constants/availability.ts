import type { Availability } from './languages';

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

// Convert a wall-clock time ('HH:MM') from one IANA zone to another.
export const convertTime = (
  time24: string,
  fromTz: string,
  toTz: string,
): { h: number; m: number } => {
  const [h, m] = time24.split(':').map(Number);
  try {
    const now = new Date();
    const fromLocal = new Date(
      now.toLocaleString('en-US', { timeZone: fromTz }),
    );
    const utcLocal = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const toLocal = new Date(now.toLocaleString('en-US', { timeZone: toTz }));
    const fromOffMs = fromLocal.getTime() - utcLocal.getTime();
    const toOffMs = toLocal.getTime() - utcLocal.getTime();
    const utcMs = h * 3600000 + m * 60000 - fromOffMs;
    const totalMin = Math.round((utcMs + toOffMs) / 60000);
    return {
      h: ((Math.floor(totalMin / 60) % 24) + 24) % 24,
      m: ((totalMin % 60) + 60) % 60,
    };
  } catch {
    return { h, m };
  }
};

export const fmtHour = (h: number, m: number): string => {
  const period = h < 12 ? 'am' : 'pm';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0
    ? `${hour12}${period}`
    : `${hour12}:${String(m).padStart(2, '0')}${period}`;
};

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
  const ownerStr = `${daysLabel} · ${fmtHour(fromHour, fromMin)} ${labels.to} ${fmtHour(toHour, toMin)}${abbr ? ` ${abbr}` : ''}`;

  if (!ownerTimezone || !viewerTimezone || viewerTimezone === ownerTimezone) {
    return { ownerStr, viewerStr: null };
  }

  const viewerFrom = convertTime(pattern.from, ownerTimezone, viewerTimezone);
  const viewerTo = convertTime(pattern.to, ownerTimezone, viewerTimezone);
  return {
    ownerStr,
    viewerStr: `${fmtHour(viewerFrom.h, viewerFrom.m)} ${labels.to} ${fmtHour(viewerTo.h, viewerTo.m)} ${labels.viewerSuffix}`,
  };
};

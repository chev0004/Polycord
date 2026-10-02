import { countryOptions } from '@/constants';
import type {
  AvailabilityDays,
  AvailabilityPattern,
} from '@/constants/availability';
import {
  getLanguageGreeting,
  getLanguageName,
  getNativeLanguageName,
  Proficiency,
} from '@/constants/languages';
import type {
  DiscordCardAvailability,
  DiscordCardData,
  DiscordCardTarget,
} from './types';

export type DiscordCardLabels = {
  days: Record<AvailabilityDays, string>;
  daysShort: Record<AvailabilityDays, string>;
  anyTime: string;
  levels: Record<Proficiency, string>;
};

type BuildDiscordCardDataInput = {
  name: string;
  handle?: string;
  avatarUrl?: string;
  primaryLanguage: string;
  targetLanguages: { language: string; level?: string }[];
  tags: string[];
  availability?: AvailabilityPattern | null;
  country?: string;
  time?: string;
  locale: string;
  labels: DiscordCardLabels;
};

const LEVEL_STEPS: Record<Proficiency, number> = {
  [Proficiency.BEGINNER]: 1,
  [Proficiency.INTERMEDIATE]: 2,
  [Proficiency.ADVANCED]: 3,
  [Proficiency.NATIVE_LEVEL]: 4,
};

const isProficiency = (value: string): value is Proficiency =>
  value in LEVEL_STEPS;

export const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

const shortHour = (time: string) => {
  const [hours, minutes] = time.split(':');
  return minutes === '00' ? String(Number(hours)) : time;
};

const buildAvailability = (
  pattern: AvailabilityPattern,
  labels: DiscordCardLabels,
): DiscordCardAvailability => {
  const days = labels.days[pattern.days] ?? labels.days.any;
  const range = pattern.anyTime
    ? labels.anyTime
    : `${pattern.from}–${pattern.to}`;
  const rangeShort = pattern.anyTime
    ? labels.anyTime
    : `${shortHour(pattern.from)}–${shortHour(pattern.to)}`;

  return {
    days,
    range,
    rangeShort,
    text:
      pattern.anyTime && pattern.days === 'any'
        ? labels.anyTime
        : `${days} ${pattern.anyTime ? `· ${labels.anyTime}` : range}`,
    short: `${days} ${rangeShort}`,
    abbr: `${labels.daysShort[pattern.days] ?? labels.daysShort.any} ${rangeShort}`,
  };
};

const buildTarget = (
  row: { language: string; level?: string },
  locale: string,
  labels: DiscordCardLabels,
): DiscordCardTarget => ({
  name: getLanguageName(row.language, locale),
  script: getNativeLanguageName(row.language),
  code: row.language.toUpperCase(),
  greeting: getLanguageGreeting(row.language),
  level: row.level && isProficiency(row.level) ? labels.levels[row.level] : '',
  steps: row.level && isProficiency(row.level) ? LEVEL_STEPS[row.level] : 0,
});

export const buildDiscordCardData = ({
  name,
  handle,
  avatarUrl,
  primaryLanguage,
  targetLanguages,
  tags,
  availability,
  country,
  time,
  locale,
  labels,
}: BuildDiscordCardDataInput): DiscordCardData => ({
  name,
  handle: handle ? `@${handle}` : '',
  avatarUrl,
  initials: getInitials(name),
  native: {
    name: primaryLanguage ? getLanguageName(primaryLanguage, locale) : '',
    script: primaryLanguage ? getNativeLanguageName(primaryLanguage) : '',
    code: primaryLanguage.toUpperCase(),
    greeting: primaryLanguage ? getLanguageGreeting(primaryLanguage) : '',
  },
  targets: targetLanguages
    .filter((row) => row.language)
    .map((row) => buildTarget(row, locale, labels)),
  tags,
  tagsText: `${tags.slice(0, 3).join(' · ')}${tags.length > 3 ? ` +${tags.length - 3}` : ''}`,
  availability: availability
    ? buildAvailability(availability, labels)
    : undefined,
  country: country
    ? (countryOptions(locale).find((option) => option.value === country)
        ?.label ?? '')
    : '',
  time: time ?? '',
});

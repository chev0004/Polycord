import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';
import {
  MdAccessTime,
  MdLanguage,
  MdLocationOn,
  MdSchedule,
  MdSchool,
} from 'react-icons/md';
import type { FilterConfig } from '@/components/Filter/FilterBar';
import { countryOptions } from '@/constants/countries';
import {
  formatTimezone,
  languageOptions,
  proficiencyOptions,
} from '@/constants/languages';
import {
  type AvailabilityContext,
  isAvailableNow,
  MEANINGFUL_OVERLAP_MINUTES,
  overlapMinutes,
} from './availabilityOverlap';
import type { DiscoveryProfile } from './ProfileCard';

export type DiscoveryFilterValues = Record<string, string | string[]>;

export const AVAILABILITY_AVAILABLE_NOW = 'available-now';
export const AVAILABILITY_OVERLAPS = 'overlaps';

const toAvailabilityContext = (
  profile: DiscoveryProfile,
): AvailabilityContext => ({
  availability: profile.availability,
  timezone: profile.timezone,
});

// The timezone picker mirrors the runtime's IANA zones so values stay aligned
// with what profiles persist. Guarded for engines without supportedValuesOf.
export const getTimezoneFilterOptions = (): {
  label: string;
  value: string;
}[] => {
  try {
    if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
      return Intl.supportedValuesOf('timeZone')
        .map((timezone) => ({
          label: `${formatTimezone(timezone)} - ${timezone}`,
          value: timezone,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
  } catch {
    return [];
  }
  return [];
};

export const useDiscoveryFilterDefs = (options?: {
  viewerHasAvailability?: boolean;
}): FilterConfig[] => {
  const locale = useLocale();
  const t = useTranslations('Discovery');
  const viewerHasAvailability = options?.viewerHasAvailability ?? false;

  return useMemo(
    () => [
      {
        id: 'primaryLanguage',
        icon: MdLanguage,
        labelKey: 'filterPrimaryLanguage',
        placeholderKey: 'filterSelectLanguage',
        options: languageOptions(locale),
        multiple: true,
      },
      {
        id: 'targetLanguage',
        icon: MdLanguage,
        labelKey: 'filterTargetLanguage',
        placeholderKey: 'filterSelectLanguage',
        options: languageOptions(locale),
        multiple: true,
      },
      {
        id: 'country',
        icon: MdLocationOn,
        labelKey: 'filterCountry',
        placeholderKey: 'filterSelectCountry',
        options: countryOptions(locale),
        multiple: true,
      },
      {
        id: 'proficiency',
        icon: MdSchool,
        labelKey: 'filterProficiency',
        placeholderKey: 'filterSelectLevel',
        options: proficiencyOptions(locale),
      },
      {
        id: 'timezone',
        icon: MdAccessTime,
        labelKey: 'filterTimezone',
        placeholderKey: 'filterSelectTimezone',
        options: getTimezoneFilterOptions(),
        multiple: true,
      },
      {
        id: 'availability',
        icon: MdSchedule,
        labelKey: 'filterAvailability',
        placeholderKey: 'filterSelectAvailability',
        options: [
          { value: AVAILABILITY_AVAILABLE_NOW, label: t('filterAvailableNow') },
          ...(viewerHasAvailability
            ? [
                {
                  value: AVAILABILITY_OVERLAPS,
                  label: t('filterOverlapsWithMe'),
                },
              ]
            : []),
        ],
      },
    ],
    [locale, t, viewerHasAvailability],
  );
};

const toSelection = (value: string | string[] | undefined): string[] => {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
};

// Narrows profiles to those matching every active filter. Kept as a pure
// function with the same value shape DISC-002 will send to the server.
export const applyDiscoveryFilters = (
  profiles: DiscoveryProfile[],
  values: DiscoveryFilterValues,
  viewer?: AvailabilityContext,
): DiscoveryProfile[] => {
  const primaryLanguage = toSelection(values.primaryLanguage);
  const targetLanguage = toSelection(values.targetLanguage);
  const country = toSelection(values.country);
  const proficiency = toSelection(values.proficiency);
  const timezone = toSelection(values.timezone);
  const availability = toSelection(values.availability)[0];

  return profiles.filter((profile) => {
    if (
      primaryLanguage.length &&
      !primaryLanguage.includes(profile.primaryLanguage)
    ) {
      return false;
    }

    if (
      targetLanguage.length &&
      !profile.targetLanguages.some((language) =>
        targetLanguage.includes(language.language),
      )
    ) {
      return false;
    }

    if (
      proficiency.length &&
      !profile.targetLanguages.some(
        (language) => language.level && proficiency.includes(language.level),
      )
    ) {
      return false;
    }

    if (
      country.length &&
      !(profile.country && country.includes(profile.country))
    ) {
      return false;
    }

    if (
      timezone.length &&
      !(profile.timezone && timezone.includes(profile.timezone))
    ) {
      return false;
    }

    if (
      availability === AVAILABILITY_AVAILABLE_NOW &&
      !isAvailableNow(toAvailabilityContext(profile))
    ) {
      return false;
    }

    if (
      availability === AVAILABILITY_OVERLAPS &&
      (!viewer ||
        overlapMinutes(viewer, toAvailabilityContext(profile)) <
          MEANINGFUL_OVERLAP_MINUTES)
    ) {
      return false;
    }

    return true;
  });
};

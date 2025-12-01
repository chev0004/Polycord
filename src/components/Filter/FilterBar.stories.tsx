import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { useLocale } from 'next-intl';
import { useMemo } from 'react';
import {
  MdAccessTime,
  MdLanguage,
  MdLocationOn,
  MdSchool,
} from 'react-icons/md';
import { countryOptions } from '@/constants/countries';
import {
  formatTimezone,
  languageOptions,
  proficiencyOptions,
} from '@/constants/languages';
import { FilterBar } from './FilterBar';
import 'src/app/globals.css';

const meta: Meta<typeof FilterBar> = {
  title: 'Components/Filter/FilterBar',
  component: FilterBar,
  args: {
    onFilterChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof FilterBar>;

// Helper for timezones (can remain outside or move inside if it needs locale later)
const getTimezoneOptions = () => {
  try {
    if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
      const timezones = Intl.supportedValuesOf('timeZone');
      return timezones
        .map((tz) => ({
          label: `${formatTimezone(tz)} - ${tz}`,
          value: tz,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
  } catch {
    // Fallback
  }
  return [];
};

export const Default: Story = {
  render: (args) => {
    // 1. Hook into the current locale from Storybook's context
    const locale = useLocale();

    // 2. Re-calculate options whenever 'locale' changes
    const filters = useMemo(
      () => [
        {
          id: 'primaryLanguage',
          icon: MdLanguage,
          labelKey: 'filterPrimaryLanguage',
          placeholderKey: 'filterSelectLanguage',
          options: languageOptions(locale), // Pass dynamic locale
          multiple: true,
        },
        {
          id: 'targetLanguage',
          icon: MdLanguage,
          labelKey: 'filterTargetLanguage',
          placeholderKey: 'filterSelectLanguage',
          options: languageOptions(locale), // Pass dynamic locale
          multiple: true,
        },
        {
          id: 'country',
          icon: MdLocationOn,
          labelKey: 'filterCountry',
          placeholderKey: 'filterSelectCountry',
          options: countryOptions(locale), // Pass dynamic locale
          multiple: true,
        },
        {
          id: 'proficiency',
          icon: MdSchool,
          labelKey: 'filterProficiency',
          placeholderKey: 'filterSelectLevel',
          options: proficiencyOptions(locale), // Pass dynamic locale
          multiple: true,
        },
        {
          id: 'timezone',
          icon: MdAccessTime,
          labelKey: 'filterTimezone',
          placeholderKey: 'filterSelectTimezone',
          options: getTimezoneOptions(),
          multiple: true,
        },
      ],
      [locale],
    );

    return <FilterBar {...args} filters={filters} />;
  },
};
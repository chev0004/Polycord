import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
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
import { FilterButton } from './FilterButton';
import 'src/app/globals.css';

const meta: Meta<typeof FilterButton> = {
  title: 'Components/Filter/FilterButton',
  component: FilterButton,
  args: {
    onValueChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof FilterButton>;

const defaultLocale = 'en';

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
    return [];
  }
  return [];
};

export const Language: Story = {
  args: {
    icon: MdLanguage,
    labelKey: 'filterPrimaryLanguage',
    placeholderKey: 'filterSelectLanguage',
    options: languageOptions(defaultLocale),
  },
};

export const Country: Story = {
  args: {
    icon: MdLocationOn,
    labelKey: 'filterCountry',
    placeholderKey: 'filterSelectCountry',
    options: countryOptions(defaultLocale),
  },
};

export const Proficiency: Story = {
  args: {
    icon: MdSchool,
    labelKey: 'filterProficiency',
    placeholderKey: 'filterSelectLevel',
    options: proficiencyOptions(defaultLocale),
  },
};

export const Timezone: Story = {
  args: {
    icon: MdAccessTime,
    labelKey: 'filterTimezone',
    placeholderKey: 'filterSelectTimezone',
    options: getTimezoneOptions(),
  },
};

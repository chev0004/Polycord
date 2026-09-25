import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, waitFor, within } from '@storybook/test';
import { useLocale } from 'next-intl';
import { useMemo, useState } from 'react';
import {
  MdAccessTime,
  MdLanguage,
  MdLocationOn,
  MdSchool,
  MdSwapVert,
} from 'react-icons/md';
import { countryOptions } from '@/constants/countries';
import {
  formatTimezone,
  languageOptions,
  proficiencyOptions,
} from '@/constants/languages';
import type { FilterBarProps } from './FilterBar';
import { FilterBar } from './FilterBar';

const meta: Meta<typeof FilterBar> = {
  title: 'Components/Filter/FilterBar',
  component: FilterBar,
  args: {
    onFilterChange: fn(),
    onClearFilters: fn(),
  },
  decorators: [
    (Story) => (
      <div className="min-h-[420px] p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FilterBar>;

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

const useFilterDefs = () => {
  const locale = useLocale();

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
};

type ControlledFilterBarProps = Omit<FilterBarProps, 'filters' | 'values'> & {
  initialValues?: Record<string, string | string[]>;
};

const ControlledFilterBar = ({
  initialValues,
  onFilterChange,
  onClearFilters,
  ...props
}: ControlledFilterBarProps) => {
  const filters = useFilterDefs();
  const [values, setValues] = useState<Record<string, string | string[]>>(
    initialValues ?? {},
  );

  return (
    <FilterBar
      {...props}
      filters={filters}
      values={values}
      onFilterChange={(filterId, value) => {
        onFilterChange?.(filterId, value);
        setValues((prev) => ({ ...prev, [filterId]: value }));
      }}
      onClearFilters={() => {
        onClearFilters?.();
        setValues({});
      }}
    />
  );
};

export const Default: Story = {
  render: (args) => <ControlledFilterBar {...args} />,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(
      canvas.getByRole('button', { name: 'Primary Language' }),
    );

    await userEvent.click(
      await body.findByRole('button', { name: 'Japanese' }),
    );
    await userEvent.click(body.getByRole('button', { name: 'Korean' }));
    await userEvent.click(body.getByRole('button', { name: 'Apply' }));

    await expect(args.onFilterChange).toHaveBeenCalledWith('primaryLanguage', [
      'ja',
      'ko',
    ]);
    await waitFor(() =>
      expect(canvas.getByText('Primary Language')).toBeInTheDocument(),
    );

    await userEvent.click(
      canvas.getByRole('button', { name: 'Clear filters' }),
    );

    await expect(args.onClearFilters).toHaveBeenCalled();
    await waitFor(() =>
      expect(
        canvas.queryByRole('button', { name: 'Clear filters' }),
      ).not.toBeInTheDocument(),
    );
  },
};

export const WithSortSlot: Story = {
  render: (args) => (
    <ControlledFilterBar
      {...args}
      initialValues={{ proficiency: 'advanced', country: ['JP', 'KR'] }}
      sortControl={
        <button
          type="button"
          aria-label="Sort"
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-background-dark hover:text-foreground"
        >
          <MdSwapVert size={20} />
        </button>
      }
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole('button', { name: 'Sort' }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: 'Clear filters' }),
    ).toBeInTheDocument();
    await expect(canvas.getByText('Advanced')).toBeInTheDocument();
    await expect(canvas.getByText('Country')).toBeInTheDocument();
    await expect(canvas.getByText('2')).toBeInTheDocument();
    await expect(canvas.getByText('1')).toBeInTheDocument();
  },
};

import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, waitFor, within } from '@storybook/test';
import { MdLanguage, MdLocationOn, MdSchool } from 'react-icons/md';
import { countryOptions } from '@/constants/countries';
import { languageOptions, proficiencyOptions } from '@/constants/languages';
import { FilterButton } from './FilterButton';

const meta: Meta<typeof FilterButton> = {
  title: 'Components/Filter/FilterButton',
  component: FilterButton,
  args: {
    onValueChange: fn(),
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
type Story = StoryObj<typeof FilterButton>;

const defaultLocale = 'en';

export const Single: Story = {
  args: {
    icon: MdSchool,
    labelKey: 'filterProficiency',
    placeholderKey: 'filterSelectLevel',
    options: proficiencyOptions(defaultLocale),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(canvas.getByRole('button', { name: 'Proficiency' }));

    await userEvent.click(
      await body.findByRole('button', { name: 'Beginner' }),
    );
    await userEvent.click(body.getByRole('button', { name: 'Advanced' }));

    await expect(
      body.getByRole('button', { name: 'Beginner' }),
    ).toHaveAttribute('aria-pressed', 'false');
    await expect(
      body.getByRole('button', { name: 'Advanced' }),
    ).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(body.getByRole('button', { name: 'Apply' }));

    await expect(args.onValueChange).toHaveBeenCalledWith('advanced');
  },
};

export const Multi: Story = {
  args: {
    icon: MdLanguage,
    labelKey: 'filterPrimaryLanguage',
    placeholderKey: 'filterSelectLanguage',
    options: languageOptions(defaultLocale),
    multiple: true,
  },
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

    await expect(args.onValueChange).toHaveBeenCalledWith(['ja', 'ko']);
  },
};

export const Searchable: Story = {
  args: {
    icon: MdLocationOn,
    labelKey: 'filterCountry',
    placeholderKey: 'filterSelectCountry',
    options: countryOptions(defaultLocale),
    multiple: true,
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(canvas.getByRole('button', { name: 'Country' }));

    const search = await body.findByPlaceholderText('Select country');
    await userEvent.type(search, 'japan');
    await userEvent.click(body.getByRole('button', { name: 'Japan' }));

    await userEvent.clear(search);
    await userEvent.type(search, 'zzzzzz');
    await expect(body.getByText('No results found')).toBeInTheDocument();

    await userEvent.clear(search);
    await userEvent.click(body.getByRole('button', { name: 'Apply' }));

    await expect(args.onValueChange).toHaveBeenCalledWith(['JP']);
  },
};

export const Active: Story = {
  args: {
    icon: MdLanguage,
    labelKey: 'filterPrimaryLanguage',
    placeholderKey: 'filterSelectLanguage',
    options: languageOptions(defaultLocale),
    multiple: true,
    value: ['ja', 'ko'],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('2 selected')).toBeInTheDocument();
    await expect(canvas.getByText('2')).toBeInTheDocument();
  },
};

export const Cancel: Story = {
  args: {
    icon: MdSchool,
    labelKey: 'filterProficiency',
    placeholderKey: 'filterSelectLevel',
    options: proficiencyOptions(defaultLocale),
    multiple: true,
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(canvas.getByRole('button', { name: 'Proficiency' }));

    await userEvent.click(
      await body.findByRole('button', { name: 'Intermediate' }),
    );
    await userEvent.click(body.getByRole('button', { name: 'Cancel' }));

    await expect(args.onValueChange).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(
        body.queryByRole('button', { name: 'Apply' }),
      ).not.toBeInTheDocument(),
    );
  },
};

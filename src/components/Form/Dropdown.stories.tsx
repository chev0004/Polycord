import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, screen, userEvent, within } from '@storybook/test';
import { MdLanguage } from 'react-icons/md';
import { countryOptions } from '@/constants/countries';
import { proficiencyOptions } from '@/constants/languages';
import { Dropdown } from './Dropdown';

const options = proficiencyOptions('en');
const countries = countryOptions('en');

const meta: Meta<typeof Dropdown> = {
  title: 'Components/Form/Dropdown',
  component: Dropdown,
  args: {
    options,
    placeholder: 'Select your level',
    fullWidth: true,
    onValueChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-80 p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Dropdown>;

export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('combobox');

    await userEvent.click(trigger);
    const option = await screen.findByRole('option', {
      name: options[2].label,
    });
    await userEvent.click(option);

    await expect(args.onValueChange).toHaveBeenCalledWith(options[2].value);
  },
};

export const WithValue: Story = {
  args: {
    value: options[1].value,
  },
};

export const Searchable: Story = {
  args: {
    options: countries,
    placeholder: 'Select a country',
    searchable: true,
    searchPlaceholder: 'Search countries',
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('combobox');

    await userEvent.click(trigger);
    const search = await screen.findByPlaceholderText('Search countries');
    await userEvent.type(search, 'jap');
    const option = await screen.findByRole('option', { name: 'Japan' });
    await userEvent.click(option);

    await expect(args.onValueChange).toHaveBeenCalled();
  },
};

export const ErrorState: Story = {
  args: {
    error: true,
  },
};

export const Minimal: Story = {
  args: {
    variant: 'minimal',
    icon: MdLanguage,
    label: 'Language',
    fullWidth: false,
  },
};

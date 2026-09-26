import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, screen, userEvent, within } from '@storybook/test';
import { useEffect, useState } from 'react';
import { countryOptions } from '@/constants/countries';
import { proficiencyOptions } from '@/constants/languages';
import { Select } from './Select';

const options = proficiencyOptions('en');
const countries = countryOptions('en');

const meta: Meta<typeof Select> = {
  title: 'Components/Form/Select',
  component: Select,
  args: {
    options,
    placeholder: 'Select your level',
    onValueChange: fn(),
    ariaLabel: 'Proficiency level',
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
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('combobox');

    await userEvent.click(trigger);
    const option = await screen.findByRole('option', {
      name: options[1].label,
    });
    await userEvent.click(option);

    await expect(args.onValueChange).toHaveBeenCalledWith(options[1].value);
  },
};

export const WithValue: Story = {
  args: {
    defaultValue: options[0].value,
  },
};

const RestoredValueForm = (args: React.ComponentProps<typeof Select>) => {
  const [value, setValue] = useState('');
  useEffect(() => setValue(options[2].value), []);

  return (
    <form>
      <Select {...args} value={value} onValueChange={setValue} />
    </form>
  );
};

export const RestoredValue: Story = {
  render: (args) => <RestoredValueForm {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByRole('combobox')).toHaveTextContent(
      options[2].label,
    );
    await new Promise((resolve) => setTimeout(resolve, 300));
    await expect(canvas.getByRole('combobox')).toHaveTextContent(
      options[2].label,
    );
  },
};

export const LongList: Story = {
  args: {
    options: countries,
    placeholder: 'Select a country',
    ariaLabel: 'Country',
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('combobox');

    await userEvent.click(trigger);
    const option = await screen.findByRole('option', {
      name: 'Japan',
    });
    await userEvent.click(option);

    await expect(args.onValueChange).toHaveBeenCalledWith('JP');
  },
};

export const ErrorState: Story = {
  args: {
    error: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('combobox')).toBeDisabled();
  },
};

import type { Meta, StoryObj } from '@storybook/react';
import {
  expect,
  fn,
  screen,
  userEvent,
  waitFor,
  within,
} from '@storybook/test';
import { useState } from 'react';
import { countryOptions } from '@/constants/countries';
import { languageOptions } from '@/constants/languages';
import { Combobox, type ComboboxProps } from './Combobox';

const languages = languageOptions('en');
const countries = countryOptions('en');

const ControlledCombobox = (props: ComboboxProps) => {
  const [value, setValue] = useState(props.value ?? '');

  return (
    <Combobox
      {...props}
      value={value}
      onValueChange={(next) => {
        props.onValueChange(next);
        setValue(next);
      }}
    />
  );
};

const meta: Meta<typeof Combobox> = {
  title: 'Components/Form/Combobox',
  component: Combobox,
  args: {
    options: languages,
    placeholder: 'Enter a language...',
    value: '',
    onValueChange: fn(),
  },
  render: (args) => <ControlledCombobox {...args} />,
  decorators: [
    (Story) => (
      <div className="w-80 p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Combobox>;

const japanese = languages.find((option) => option.label === 'Japanese');

export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    if (!japanese) return;

    const canvas = within(canvasElement);
    const input = canvas.getByPlaceholderText('Enter a language...');

    await userEvent.type(input, 'japan');
    // The option list debounces typing, so allow slow environments to settle.
    const option = await screen.findByRole(
      'button',
      { name: japanese.label },
      { timeout: 5000 },
    );
    await userEvent.click(option);

    await expect(args.onValueChange).toHaveBeenCalledWith(japanese.value);
    await waitFor(() => expect(input).toHaveValue(japanese.label), {
      timeout: 5000,
    });
  },
};

export const WithValue: Story = {
  args: {
    value: languages[0].value,
  },
};

export const LongList: Story = {
  args: {
    options: countries,
    placeholder: 'Enter a country...',
  },
};

export const EmptyResults: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByPlaceholderText('Enter a language...');

    await userEvent.type(input, 'zzzz');

    await expect(await screen.findByText('No results found.')).toBeVisible();
  },
};

export const ErrorState: Story = {
  args: {
    error: true,
  },
};

export const ReadOnly: Story = {
  args: {
    value: japanese?.value ?? '',
    readOnly: true,
  },
  play: async ({ canvasElement }) => {
    if (!japanese) return;

    const canvas = within(canvasElement);
    const input = canvas.getByDisplayValue(japanese.label);

    await userEvent.type(input, 'changed');

    await expect(input).toHaveValue(japanese.label);
  },
};

export const Disabled: Story = {
  args: {
    value: japanese?.value ?? '',
    disabled: true,
  },
  play: async ({ canvasElement }) => {
    if (!japanese) return;

    const canvas = within(canvasElement);
    const input = canvas.getByDisplayValue(japanese.label);

    await expect(input).toBeDisabled();
  },
};

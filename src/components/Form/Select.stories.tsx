import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, screen, userEvent, within } from '@storybook/test';
import { proficiencyOptions } from '@/constants/languages';
import { Select } from './Select';

const options = proficiencyOptions('en');

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

export const ErrorState: Story = {
  args: {
    error: true,
  },
};

import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import { TextInput } from './TextInput';

const meta: Meta<typeof TextInput> = {
  title: 'Components/Form/TextInput',
  component: TextInput,
  decorators: [
    (Story) => (
      <div className="w-80 p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TextInput>;

export const Default: Story = {
  args: {
    placeholder: 'Enter your email for recovery',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByPlaceholderText('Enter your email for recovery');

    await userEvent.type(input, 'kenji.ito@example.com');

    await expect(input).toHaveValue('kenji.ito@example.com');
  },
};

export const Filled: Story = {
  args: {
    defaultValue: 'Asia/Tokyo',
  },
};

export const ErrorState: Story = {
  args: {
    defaultValue: 'not-an-email',
    error: true,
  },
};

export const ReadOnly: Story = {
  args: {
    defaultValue: 'Asia/Tokyo',
    readOnly: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByDisplayValue('Asia/Tokyo');

    await userEvent.type(input, 'changed');

    await expect(input).toHaveValue('Asia/Tokyo');
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Type DELETE to confirm',
    disabled: true,
  },
};

import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import { TextArea } from './TextArea';

const meta: Meta<typeof TextArea> = {
  title: 'Components/Form/TextArea',
  component: TextArea,
  decorators: [
    (Story) => (
      <div className="w-96 p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TextArea>;

export const Default: Story = {
  args: {
    placeholder: 'Tell us a bit about yourself and your language goals.',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByPlaceholderText(
      'Tell us a bit about yourself and your language goals.',
    );

    await userEvent.type(textarea, 'I am a graphic designer in Osaka.');

    await expect(textarea).toHaveValue('I am a graphic designer in Osaka.');
  },
};

export const WithValue: Story = {
  args: {
    defaultValue:
      'I am a graphic designer in Osaka looking for a patient partner to practice everyday English with. I can already read and write fairly well, but speaking still makes me nervous. In return I am happy to help with Japanese at any level.',
  },
};

export const ErrorState: Story = {
  args: {
    defaultValue: 'Too short',
    error: true,
  },
};

export const ReadOnly: Story = {
  args: {
    defaultValue: 'I can read this, but I cannot edit it.',
    readOnly: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByDisplayValue(
      'I can read this, but I cannot edit it.',
    );

    await userEvent.type(textarea, 'changed');

    await expect(textarea).toHaveValue(
      'I can read this, but I cannot edit it.',
    );
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled bio field',
    disabled: true,
  },
};

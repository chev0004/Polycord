import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { LookingForRow } from './LookingForRow';
import 'src/app/globals.css';

const meta: Meta<typeof LookingForRow> = {
  title: 'Discovery/LookingForRow',
  component: LookingForRow,
  decorators: [
    (Story) => (
      <div className="w-72 rounded-2xl bg-background-dark p-5">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LookingForRow>;

export const Default: Story = {
  args: { modes: ['casual_chat', 'gaming'] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Casual chat')).toBeInTheDocument();
    await expect(canvas.getByText('Gaming')).toBeInTheDocument();
  },
};

export const Overflow: Story = {
  args: {
    modes: [
      'casual_chat',
      'study_buddy',
      'voice_practice',
      'grammar_help',
      'gaming',
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Casual chat')).toBeInTheDocument();
    await expect(canvas.getByText('+2')).toBeInTheDocument();
    await expect(canvas.queryByText('Gaming')).not.toBeInTheDocument();
  },
};

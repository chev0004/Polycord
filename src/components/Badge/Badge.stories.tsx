import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  decorators: [
    (Story) => (
      <div className="flex gap-3 bg-background-main p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Positive: Story = {
  args: {
    children: 'Public',
    variant: 'positive',
  },
};

export const Neutral: Story = {
  args: {
    children: 'Unlisted',
    variant: 'neutral',
  },
};

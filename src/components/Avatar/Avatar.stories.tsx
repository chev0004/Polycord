import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { Avatar } from './Avatar';

const meta: Meta<typeof Avatar> = {
  title: 'Components/Avatar',
  component: Avatar,
  decorators: [
    (Story) => (
      <div className="p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Fallback: Story = {
  args: {
    size: 'md',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('?')).toBeInTheDocument();
  },
};

export const WithImage: Story = {
  args: {
    avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png',
    size: 'md',
    alt: 'Discord avatar',
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <Avatar size="sm" />
      <Avatar size="md" />
      <Avatar size="lg" />
    </div>
  ),
};

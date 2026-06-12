import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from './Avatar';

const meta: Meta<typeof Avatar> = {
  title: 'Components/Avatar',
  component: Avatar,
  decorators: [
    (Story) => (
      <div className="flex items-center gap-6 bg-background-main p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Sizes: Story = {
  render: () => (
    <>
      <Avatar size="sm" />
      <Avatar size="md" />
      <Avatar size="lg" />
    </>
  ),
};

export const Image: Story = {
  args: {
    avatarUrl: 'https://i.pravatar.cc/160?img=32',
    size: 'md',
    alt: 'Profile avatar',
  },
};

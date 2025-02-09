import type { Meta, StoryObj } from '@storybook/react';
import { Inbox } from './Inbox';

const meta: Meta<typeof Inbox> = {
  title: 'Components/Inbox',
  component: Inbox,
  decorators: [
    (Story) => (
      <div className="p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Inbox>;

export const WithNotifications: Story = {
  args: {
    notifications: [
      {
        id: '1',
        message: 'An anonymous user has copied your username',
        timestamp: '2 minutes ago',
      },
      {
        id: '2',
        message: 'xhev has copied your username',
        timestamp: '1 hour ago',
        iconUrl:
          'https://cdn.discordapp.com/avatars/559278744330698752/9c1889761120a1aafb106df8fc21222f.webp?size=2048',
      },
      {
        id: '3',
        message: 'An anonymous user has copied your username',
        timestamp: '2 hours ago',
      },
    ],
  },
};

export const Empty: Story = {
  args: {
    notifications: [],
  },
};

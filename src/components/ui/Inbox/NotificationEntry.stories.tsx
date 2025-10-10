import type { Meta, StoryObj } from '@storybook/react';
import { NotificationEntry } from './NotificationEntry';
import '@/app/globals.css';

const meta: Meta<typeof NotificationEntry> = {
  title: 'Components/NotificationEntry',
  component: NotificationEntry,
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        {
          name: 'dark',
          value: 'var(--color-background-dark)',
        },
      ],
    },
  },
  decorators: [
    (Story) => (
      <div className="p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof NotificationEntry>;

export const Default: Story = {
  args: {
    notification: {
      id: '1',
      message: 'An anonymous user has copied your username',
      timestamp: '2 minutes ago',
      iconUrl:
        'https://cdn.discordapp.com/guilds/1265539349030768650/users/559278744330698752/avatars/05acb5001d40db956558f9cfdbe6414d.webp?size=1024',
      read: false,
    },
  },
};

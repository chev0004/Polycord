import type { Meta, StoryObj } from '@storybook/react';
import { useTranslations } from 'next-intl';
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
  render: () => {
    const t = useTranslations();
    return (
      <NotificationEntry
        notification={{
          id: '1',
          message: t('anonymousUserCopied'),
          timestamp: t('minutesAgo', { count: 2 }),
          iconUrl:
            'https://cdn.discordapp.com/avatars/559278744330698752/05acb5001d40db956558f9cfdbe6414d.webp?size=1024',
          read: false,
        }}
        onMarkAsRead={() => {}}
        onDelete={() => {}}
      />
    );
  },
};

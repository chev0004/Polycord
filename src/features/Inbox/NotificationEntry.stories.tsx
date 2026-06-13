import type { Meta, StoryObj } from '@storybook/react';
import { useTranslations } from 'next-intl';
import { MOCK_USER_AVATAR_URL } from '@/constants/mock-data';
import { NotificationEntry } from './NotificationEntry';
import 'src/app/globals.css';

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

const DefaultNotificationStory = () => {
  const t = useTranslations('Inbox');
  return (
    <NotificationEntry
      notification={{
        id: '1',
        message: t('anonymousUserCopied'),
        timestamp: t('minutesAgo', { count: 2 }),
        iconUrl: MOCK_USER_AVATAR_URL,
        read: false,
      }}
      onMarkAsRead={() => {}}
      onDelete={() => {}}
    />
  );
};

export const Default: Story = {
  render: () => <DefaultNotificationStory />,
};

const ReadNotificationStory = () => {
  const t = useTranslations('Inbox');
  return (
    <NotificationEntry
      notification={{
        id: '2',
        message: t('userCopied', { user: 'xhev' }),
        timestamp: t('hoursAgo', { count: 1 }),
        iconUrl: MOCK_USER_AVATAR_URL,
        read: true,
      }}
      onMarkAsRead={() => {}}
      onDelete={() => {}}
    />
  );
};

export const Read: Story = {
  render: () => <ReadNotificationStory />,
};

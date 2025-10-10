import type { Meta, StoryObj } from '@storybook/react';
import { useTranslations } from 'next-intl';
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
  render: () => {
    const t = useTranslations();
    return (
      <Inbox
        notifications={[
          {
            id: '1',
            message: t('anonymousUserCopied'),
            timestamp: t('minutesAgo', { count: 2 }),
          },
          {
            id: '2',
            message: t('userCopied', { user: 'xhev' }),
            timestamp: t('hoursAgo', { count: 1 }),
            iconUrl:
              'https://cdn.discordapp.com/avatars/559278744330698752/05acb5001d40db956558f9cfdbe6414d.webp?size=1024',
          },
          {
            id: '3',
            message: t('anonymousUserCopied'),
            timestamp: t('hoursAgo', { count: 2 }),
          },
        ]}
      />
    );
  },
};

export const Empty: Story = {
  args: {
    notifications: [],
  },
};

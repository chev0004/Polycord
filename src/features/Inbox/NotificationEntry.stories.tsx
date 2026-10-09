import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
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
        kind: 'copy',
        actorName: 'Mina Park',
        actorAvatarUrl: MOCK_USER_AVATAR_URL,
        timestamp: t('minutesAgo', { count: 2 }),
        read: false,
      }}
      premium
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
        kind: 'view',
        actorName: 'Sophie Laurent',
        actorAvatarUrl: MOCK_USER_AVATAR_URL,
        timestamp: t('hoursAgo', { count: 1 }),
        read: true,
      }}
      premium
      onMarkAsRead={() => {}}
      onDelete={() => {}}
    />
  );
};

export const Read: Story = {
  render: () => <ReadNotificationStory />,
};

const shareStory = (
  notification: {
    actorName?: string;
    actorProfileId?: string;
    isGuest?: boolean;
  },
  premium: boolean,
  message: string,
): Story => ({
  render: () => (
    <NotificationEntry
      notification={{
        id: 'share',
        kind: 'share',
        actorAvatarUrl: notification.actorName
          ? 'https://cdn.discordapp.com/embed/avatars/2.png'
          : undefined,
        read: false,
        ...notification,
      }}
      premium={premium}
      onMarkAsRead={() => {}}
      onDelete={() => {}}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(message)).toBeInTheDocument();
    await expect(
      canvas.queryByText('This interaction is anonymous.'),
    ).not.toBeInTheDocument();
  },
});

export const ShareNamed = shareStory(
  { actorName: 'Mina Park', actorProfileId: 'profile-mina' },
  true,
  'Mina Park shared your profile',
);
export const ShareGuest = shareStory(
  { isGuest: true },
  true,
  'A guest shared your profile',
);
export const ShareHidden = shareStory({}, true, 'A user shared your profile');
export const ShareFree = shareStory(
  { actorName: 'Mina Park' },
  false,
  'Someone shared your profile',
);

const noticeStory = (acknowledgedAt?: string): Story => {
  const onOpenNotice = fn();
  return {
    render: () => (
      <NotificationEntry
        notification={{
          id: 'notice',
          kind: 'warning',
          warningCategory: 'harassment',
          message: 'Harassment',
          acknowledgedAt,
          timestamp: '2 minutes ago',
          read: acknowledgedAt !== undefined,
        }}
        onMarkAsRead={() => {}}
        onDelete={() => {}}
        onOpenNotice={onOpenNotice}
      />
    ),
    play: async ({ canvasElement }) => {
      const canvas = within(canvasElement);
      await expect(
        canvas.getByText('Note from moderation'),
      ).toBeInTheDocument();
      await expect(canvas.getByText('Read warning')).toBeInTheDocument();
      const actions = canvas.queryByTitle('Delete');
      if (acknowledgedAt) await expect(actions).not.toBeNull();
      else await expect(actions as HTMLElement).not.toBeVisible();
      await userEvent.click(
        canvas.getByRole('button', { name: /Note from moderation/ }),
      );
      await expect(onOpenNotice).toHaveBeenCalledOnce();
    },
  };
};

export const ModerationNote = noticeStory();
export const ModerationNoteAcknowledged = noticeStory(new Date().toISOString());

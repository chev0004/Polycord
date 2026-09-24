import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { ToastStack } from '@/components/Toast';
import { MOCK_USER_AVATAR_URL } from '@/constants/mock-data';
import { type ToastData, useToastStack } from '@/hooks/useToast';
import type { Notification } from '@/types';
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

const FreeNotificationsStory = () => {
  const t = useTranslations('Inbox');
  return (
    <Inbox
      persist={false}
      notifications={[
        {
          id: '1',
          kind: 'copy',
          actorName: 'Mina Park',
          actorAvatarUrl: MOCK_USER_AVATAR_URL,
          timestamp: t('minutesAgo', { count: 2 }),
        },
        {
          id: '2',
          kind: 'view',
          actorName: 'Sophie Laurent',
          actorAvatarUrl: MOCK_USER_AVATAR_URL,
          timestamp: t('hoursAgo', { count: 1 }),
        },
        {
          id: '3',
          kind: 'copy',
          isGuest: true,
          timestamp: t('hoursAgo', { count: 2 }),
        },
      ]}
    />
  );
};

export const FreeNotifications: Story = {
  render: () => <FreeNotificationsStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = await canvas.findByRole('button', {
      name: 'Notifications',
    });

    await expect(canvas.getByText('2')).toBeInTheDocument();

    await userEvent.click(trigger);

    const portal = within(document.body);

    await expect(
      await portal.findByRole('heading', { name: 'Notifications' }),
    ).toBeInTheDocument();
    await expect(
      portal.getAllByText('A user copied your username'),
    ).toHaveLength(2);
    await expect(
      portal.getByText('See who it was with Premium'),
    ).toHaveAttribute('href', '/en/settings#premium');
    await expect(
      portal.queryByText('Sophie Laurent viewed your profile'),
    ).not.toBeInTheDocument();
  },
};

const PremiumNotificationsStory = () => {
  const t = useTranslations('Inbox');
  return (
    <Inbox
      premium
      persist={false}
      notifications={[
        {
          id: '1',
          kind: 'copy',
          actorName: 'Mina Park',
          actorAvatarUrl: MOCK_USER_AVATAR_URL,
          timestamp: t('minutesAgo', { count: 3 }),
          actorProfileId: '11111111-1111-4111-8111-111111111111',
        },
        {
          id: '2',
          kind: 'view',
          actorName: 'Sophie Laurent',
          actorAvatarUrl: MOCK_USER_AVATAR_URL,
          timestamp: t('minutesAgo', { count: 26 }),
        },
        {
          id: '3',
          kind: 'view',
          isGuest: true,
          timestamp: t('hoursAgo', { count: 1 }),
        },
        {
          id: '4',
          kind: 'copy',
          isGuest: true,
          timestamp: t('hoursAgo', { count: 2 }),
        },
      ]}
    />
  );
};

export const PremiumNotifications: Story = {
  render: () => <PremiumNotificationsStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = await canvas.findByRole('button', {
      name: 'Notifications',
    });

    await expect(canvas.getByText('4')).toBeInTheDocument();

    await userEvent.click(trigger);

    const portal = within(document.body);

    await expect(
      await portal.findByText('Mina Park copied your username'),
    ).toBeInTheDocument();
    await expect(
      portal.getByText('Sophie Laurent viewed your profile'),
    ).toBeInTheDocument();
    await expect(
      portal.getByText('A guest viewed your profile'),
    ).toBeInTheDocument();
    await expect(
      portal.getByText('An anonymous user copied your username'),
    ).toBeInTheDocument();
    await expect(
      portal.queryByText('See who it was with Premium'),
    ).not.toBeInTheDocument();
  },
};

export const Empty: Story = {
  args: {
    notifications: [],
    persist: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = await canvas.findByRole('button', {
      name: 'Notifications',
    });

    await userEvent.click(trigger);

    const portal = within(document.body);

    await expect(
      await portal.findByText('No notifications yet'),
    ).toBeInTheDocument();
    await expect(
      portal.getByText(
        "You'll see new notifications here when something happens!",
      ),
    ).toBeInTheDocument();
  },
};

export const FreeModerationWarning: Story = {
  args: {
    notifications: [{ id: 'warning', kind: 'warning' }],
    persist: false,
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      await within(canvasElement).findByRole('button', {
        name: 'Notifications',
      }),
    );
    const portal = within(document.body);
    await expect(
      portal.getByText(
        'You received a warning from the moderation team. Please review our community guidelines.',
      ),
    ).toBeInTheDocument();
    await expect(
      portal.getByRole('link', { name: 'Review community guidelines' }),
    ).toHaveAttribute('href', '/en/legal/guidelines');
    await expect(
      portal.queryByText('See who it was with Premium'),
    ).not.toBeInTheDocument();
    await userEvent.click(portal.getByRole('button', { name: 'Mark as read' }));
    await expect(
      portal.getByRole('button', { name: 'Mark as unread' }),
    ).toBeInTheDocument();
  },
};

export const UnavailableActor: Story = {
  args: {
    notifications: [{ id: 'unavailable', kind: 'copy' }],
    premium: true,
    persist: false,
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      await within(canvasElement).findByRole('button', {
        name: 'Notifications',
      }),
    );
    const portal = within(document.body);
    await expect(
      portal.getByText('This profile is no longer available to you.'),
    ).toBeInTheDocument();
    await expect(
      portal.queryByRole('link', { name: 'View profile' }),
    ).not.toBeInTheDocument();
  },
};

const LiveUpdateStory = () => {
  const t = useTranslations('Inbox');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { toasts, addToast, dismissToast } = useToastStack();

  const createNotificationAndToast = (
    actorName?: string,
    actorAvatarUrl?: string,
  ) => {
    const newNotification: Notification = {
      id: Date.now().toString(),
      kind: 'copy',
      actorName,
      timestamp: t('minutesAgo', { count: 0 }),
      actorAvatarUrl,
    };

    const newToast: Omit<ToastData, 'id'> = {
      title: t('newNotification'),
      description: actorName
        ? t('userCopied', { user: actorName })
        : t('anonymousCopyAlert'),
      duration: 5000,
      iconUrl: actorAvatarUrl,
    };

    setNotifications((prev) => [newNotification, ...prev]);
    addToast(newToast);
  };

  const simulateAnonNotification = () => {
    createNotificationAndToast();
  };

  const simulateUserNotification = () => {
    createNotificationAndToast('xhev', MOCK_USER_AVATAR_URL);
  };

  return (
    <>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <p className="text-white">
            {t('simulateTitle')} {t('simulateInfo')}
          </p>
          <div className="flex gap-4">
            <Button onClick={simulateAnonNotification}>
              {t('simulateAnonButton')}
            </Button>
            <Button variant="discord" onClick={simulateUserNotification}>
              {t('simulateUserButton')}
            </Button>
          </div>
        </div>
        <div className="relative flex h-24 w-full items-center justify-end rounded-md bg-background-darker p-4">
          <Inbox notifications={notifications} persist={false} />
        </div>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};

export const LiveUpdate: Story = {
  render: () => <LiveUpdateStory />,
};

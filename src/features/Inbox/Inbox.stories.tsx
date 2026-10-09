import type { Meta, StoryObj } from '@storybook/react';
import { expect, screen, userEvent, waitFor, within } from '@storybook/test';
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
      portal.getByText('See who it was with Supporter'),
    ).toHaveAttribute('href', '/en/settings#supporter');
    await expect(
      portal.queryByText('Sophie Laurent viewed your profile'),
    ).not.toBeInTheDocument();
  },
};

const SupporterNotificationsStory = () => {
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

export const SupporterNotifications: Story = {
  render: () => <SupporterNotificationsStory />,
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
      portal.queryByText('See who it was with Supporter'),
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
    notifications: [{ id: 'warning', kind: 'warning', message: 'Be kind.' }],
    persist: false,
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      await within(canvasElement).findByRole('button', {
        name: 'Notifications',
      }),
    );
    const portal = within(document.body);
    await expect(portal.getByText('Note from moderation')).toBeInTheDocument();
    await expect(portal.getByText('Read warning')).toBeInTheDocument();
    await expect(portal.queryByText('Be kind.')).not.toBeInTheDocument();
    await expect(
      portal.queryByText('See who it was with Supporter'),
    ).not.toBeInTheDocument();
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
          <p className="text-foreground">
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

const entryCorners = (element: HTMLElement) => {
  const entry = element.closest('[class*="rounded-row"]') as HTMLElement;
  const style = getComputedStyle(entry);
  return [style.borderTopLeftRadius, style.borderBottomLeftRadius];
};

const openInbox = async (canvasElement: HTMLElement) => {
  await userEvent.click(
    await within(canvasElement).findByRole('button', {
      name: 'Notifications',
    }),
  );
  return within(document.body);
};

export const LastEntryCorners: Story = {
  args: {
    premium: true,
    persist: false,
    notifications: [
      { id: 'a', kind: 'copy', isGuest: true },
      { id: 'b', kind: 'view', isGuest: true },
      { id: 'c', kind: 'copy', actorName: 'Mina Park' },
    ],
  },
  play: async ({ canvasElement }) => {
    const portal = await openInbox(canvasElement);
    const first = await portal.findByText(
      'An anonymous user copied your username',
    );
    const middle = portal.getByText('A guest viewed your profile');
    const last = portal.getByText('Mina Park copied your username');

    await expect(entryCorners(first)).toEqual(['6px', '6px']);
    await expect(entryCorners(middle)).toEqual(['6px', '6px']);
    await expect(entryCorners(last)).toEqual(['6px', '14px']);

    const lastEntry = last.closest('[class*="rounded-row"]') as HTMLElement;
    await userEvent.click(
      within(lastEntry).getByRole('button', { name: 'Delete' }),
    );
    await waitFor(() =>
      expect(
        portal.queryByText('Mina Park copied your username'),
      ).not.toBeInTheDocument(),
    );
    await expect(entryCorners(middle)).toEqual(['6px', '14px']);
  },
};

export const SingleEntryCorners: Story = {
  args: {
    premium: true,
    persist: false,
    notifications: [{ id: 'only', kind: 'view', isGuest: true }],
  },
  play: async ({ canvasElement }) => {
    const portal = await openInbox(canvasElement);
    await expect(
      entryCorners(await portal.findByText('A guest viewed your profile')),
    ).toEqual(['6px', '14px']);
  },
};

export const LastEntryCornersWithUpsell: Story = {
  args: {
    premium: false,
    persist: false,
    notifications: [
      { id: 'a', kind: 'copy', isGuest: true },
      { id: 'b', kind: 'copy', isGuest: true },
    ],
  },
  play: async ({ canvasElement }) => {
    const portal = await openInbox(canvasElement);
    const entries = await portal.findAllByText('A user copied your username');
    await expect(entryCorners(entries[0])).toEqual(['6px', '6px']);
    await expect(entryCorners(entries[1])).toEqual(['6px', '14px']);
  },
};

const manyNotifications = Array.from({ length: 7 }, (_, index) => ({
  id: String(index),
  kind: 'view' as const,
  isGuest: true,
}));

export const AnimatesIn: Story = {
  args: { premium: true, persist: false, notifications: manyNotifications },
  play: async ({ canvasElement }) => {
    const portal = await openInbox(canvasElement);
    const popover = document.querySelector('.InboxPopover') as HTMLElement;
    const rows = () =>
      Array.from(document.querySelectorAll<HTMLElement>('.InboxRow'));

    await waitFor(() => expect(rows()).toHaveLength(5));
    await expect(getComputedStyle(popover).animationName).toBe('inboxPopIn');
    await expect(getComputedStyle(rows()[0]).animationName).toBe('inboxIn');
    await expect(
      rows().map((row) => getComputedStyle(row).animationDelay),
    ).toEqual(['0s', '0.05s', '0.1s', '0.15s', '0.2s']);

    const first = rows()[0];
    await userEvent.click(portal.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(rows()).toHaveLength(2));
    await expect(rows()[0]).not.toBe(first);
    await expect(getComputedStyle(rows()[1]).animationDelay).toBe('0.05s');
  },
};

const realFetch = window.fetch;

const stubIncomingBatch = (premium: boolean) => {
  let reads = 0;
  const createdAt = new Date().toISOString();
  window.fetch = (async (input, init) => {
    if (!String(input).includes('/api/notifications') || init?.method) {
      return realFetch(input, init);
    }
    reads += 1;
    return Response.json({
      premium,
      notifications:
        reads === 1
          ? []
          : [
              { id: 'n4', kind: 'warning', read: false, createdAt },
              {
                id: 'n3',
                kind: 'view',
                actorName: 'Sophie Laurent',
                read: false,
                createdAt,
              },
              {
                id: 'n2',
                kind: 'share',
                actorName: 'Mina Park',
                read: false,
                createdAt,
              },
              {
                id: 'n1',
                kind: 'copy',
                actorName: 'xhev',
                read: false,
                createdAt,
              },
            ],
    });
  }) as typeof fetch;
};

const refreshInbox = () =>
  window.dispatchEvent(
    new CustomEvent('polycord:inbox-changed', { detail: 'story' }),
  );

const expectToastCount = (count: number) =>
  waitFor(() =>
    expect(screen.queryAllByText('New Notification')).toHaveLength(count),
  );

export const IncomingToastsSupporter: Story = {
  decorators: [
    (Story) => {
      stubIncomingBatch(true);
      return <Story />;
    },
  ],
  render: () => <Inbox notifications={[]} />,
  play: async () => {
    await screen.findByRole('button', { name: 'Notifications' });
    await expect(
      screen.queryByText('New Notification'),
    ).not.toBeInTheDocument();

    refreshInbox();

    await expectToastCount(4);
    for (const message of [
      'xhev copied your username',
      'Mina Park shared your profile',
      'Sophie Laurent viewed your profile',
      'Note from moderation',
    ]) {
      await expect(screen.getByText(message)).toBeInTheDocument();
    }

    refreshInbox();
    await new Promise((resolve) => setTimeout(resolve, 800));
    await expectToastCount(4);
  },
};

export const IncomingToastsFree: Story = {
  decorators: [
    (Story) => {
      stubIncomingBatch(false);
      return <Story />;
    },
  ],
  render: () => <Inbox notifications={[]} />,
  play: async () => {
    await screen.findByRole('button', { name: 'Notifications' });

    refreshInbox();

    await expectToastCount(3);
    await expect(
      screen.getByText('A user copied your username'),
    ).toBeInTheDocument();
    await expect(
      screen.getByText('Someone shared your profile'),
    ).toBeInTheDocument();
    await expect(
      screen.queryByText(/viewed your profile/),
    ).not.toBeInTheDocument();
    await expect(
      screen.queryByText(/xhev|Mina|Sophie/),
    ).not.toBeInTheDocument();
  },
};

import type { Meta, StoryObj } from '@storybook/react';
import {
  expect,
  fn,
  screen,
  userEvent,
  waitFor,
  within,
} from '@storybook/test';
import { MobileNavigation } from './MobileNavigation';
import { RouteProgressProvider } from './RouteProgress';

const realFetch = window.fetch;
const notificationReads = fn();

const stubLiveInbox = () => {
  notificationReads.mockClear();
  window.fetch = (async (input, init) => {
    if (!String(input).includes('/api/notifications')) {
      return realFetch(input, init);
    }
    if (init?.method) return new Response(null, { status: 204 });
    notificationReads();
    return Response.json({
      premium: true,
      notifications: [
        {
          id: 'n1',
          kind: 'copy',
          actorName: 'xhev',
          actorProfileId: 'p1',
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...(notificationReads.mock.calls.length > 1
          ? [
              {
                id: 'n2',
                kind: 'share',
                actorName: 'Mina Park',
                actorProfileId: 'p2',
                read: false,
                createdAt: new Date().toISOString(),
              },
            ]
          : []),
      ],
    });
  }) as typeof fetch;
};

const stubNotifications = (premium: boolean) => {
  let reads = 0;
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
              {
                id: 'n1',
                kind: 'copy',
                actorName: 'xhev',
                actorProfileId: 'p1',
                read: false,
                createdAt: new Date().toISOString(),
              },
            ],
    });
  }) as typeof fetch;
};

const stubBatch = () => {
  let reads = 0;
  const createdAt = new Date().toISOString();
  window.fetch = (async (input, init) => {
    if (!String(input).includes('/api/notifications') || init?.method) {
      return realFetch(input, init);
    }
    reads += 1;
    return Response.json({
      premium: true,
      notifications:
        reads === 1
          ? []
          : [
              { id: 'n3', kind: 'warning', read: false, createdAt },
              {
                id: 'n2',
                kind: 'share',
                actorName: 'Mina Park',
                actorProfileId: 'p2',
                read: false,
                createdAt,
              },
              {
                id: 'n1',
                kind: 'copy',
                actorName: 'xhev',
                actorProfileId: 'p1',
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

const meta: Meta<typeof MobileNavigation> = {
  title: 'Navigation/MobileNavigation',
  component: MobileNavigation,
  decorators: [
    (Story) => (
      <RouteProgressProvider>
        <Story />
      </RouteProgressProvider>
    ),
  ],
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/en' } },
    viewport: { defaultViewport: 'mobile1' },
  },
  args: { locale: 'en', onNavigate: fn() },
};

export default meta;
type Story = StoryObj<typeof MobileNavigation>;

export const LiveInbox: Story = {
  render: (args) => (
    <>
      <div className="h-[1200px]">
        <input aria-label="Draft" defaultValue="Unsent edit" />
      </div>
      <MobileNavigation {...args} />
    </>
  ),
  decorators: [
    (Story) => {
      stubLiveInbox();
      return <Story />;
    },
  ],
  play: async ({ args }) => {
    const draft = screen.getByRole('textbox', { name: 'Draft' });
    window.scrollTo(0, 240);
    const scroll = window.scrollY;
    const dock = await screen.findByRole('button', {
      name: 'Inbox, 1 unread',
    });
    await userEvent.click(dock);
    const inbox = within(await screen.findByRole('dialog', { name: 'Inbox' }));
    await expect(
      inbox.getByRole('button', { name: /xhev copied your username/ }),
    ).toBeInTheDocument();
    await expect(inbox.queryByText('Loading notifications…')).toBeNull();
    await expect(notificationReads).toHaveBeenCalledOnce();
    await expect(args.onNavigate).not.toHaveBeenCalled();

    refreshInbox();
    await inbox.findByRole('button', { name: /Mina Park shared your profile/ });
    await userEvent.click(
      inbox.getByRole('button', { name: 'Mark all as read' }),
    );
    await waitFor(() => expect(inbox.queryAllByText('Unread')).toHaveLength(0));

    await userEvent.click(
      inbox.getByRole('button', { name: /xhev copied your username/ }),
    );
    const actions = within(
      await screen.findByRole('dialog', { name: 'xhev copied your username' }),
    );
    await userEvent.click(actions.getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(inbox.queryByText('xhev copied your username')).toBeNull(),
    );
    await userEvent.click(inbox.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await expect(screen.getByRole('textbox', { name: 'Draft' })).toBe(draft);
    await expect(draft).toHaveValue('Unsent edit');
    await expect(window.scrollY).toBe(scroll);
    await expect(screen.getByRole('button', { name: 'Inbox' })).toBe(dock);

    await userEvent.click(dock);
    const reopened = within(
      await screen.findByRole('dialog', { name: 'Inbox' }),
    );
    await expect(reopened.queryByText('xhev copied your username')).toBeNull();
    await expect(
      reopened.getByRole('button', { name: /Mina Park shared your profile/ }),
    ).toBeInTheDocument();
    await expect(reopened.queryAllByText('Unread')).toHaveLength(0);
    await expect(notificationReads).toHaveBeenCalledTimes(2);
    await expect(args.onNavigate).not.toHaveBeenCalled();
  },
};

export const JapaneseInbox: Story = {
  globals: { locale: 'ja' },
  args: { locale: 'ja' },
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/ja' } },
  },
  decorators: [
    (Story) => {
      stubLiveInbox();
      return <Story />;
    },
  ],
  play: async ({ args }) => {
    await userEvent.click(
      await screen.findByRole('button', { name: '受信ボックス、未読1件' }),
    );
    const dialog = await screen.findByRole('dialog', { name: '受信ボックス' });
    await expect(
      within(dialog).getByRole('button', { name: 'すべて既読にする' }),
    ).toBeInTheDocument();
    await expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth);
    await expect(notificationReads).toHaveBeenCalledOnce();
    await expect(args.onNavigate).not.toHaveBeenCalled();
  },
};

export const SupporterBanner: Story = {
  decorators: [
    (Story) => {
      stubNotifications(true);
      return <Story />;
    },
  ],
  play: async ({ args }) => {
    await screen.findByRole('navigation');
    await expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    refreshInbox();

    const banner = await screen.findByRole('alert');
    await expect(banner).toHaveTextContent('xhev copied your username');
    await expect(banner).toHaveTextContent('View profile');

    await userEvent.click(banner.querySelector('button') as HTMLElement);

    const inbox = within(await screen.findByRole('dialog', { name: 'Inbox' }));
    await expect(
      inbox.getByRole('button', { name: /xhev copied your username/ }),
    ).toBeInTheDocument();
    await expect(args.onNavigate).not.toHaveBeenCalled();
    await userEvent.click(inbox.getByRole('button', { name: 'Close' }));
    await waitFor(
      () => expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
      { timeout: 2000 },
    );

    refreshInbox();
    await new Promise((resolve) => setTimeout(resolve, 800));
    await expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  },
};

export const BatchedBannersQueue: Story = {
  decorators: [
    (Story) => {
      stubBatch();
      return <Story />;
    },
  ],
  play: async () => {
    await screen.findByRole('navigation');

    refreshInbox();

    for (const message of [
      'xhev copied your username',
      'Mina Park shared your profile',
      'Note from moderation',
    ]) {
      const banner = await screen.findByRole('alert', undefined, {
        timeout: 4000,
      });
      await expect(banner).toHaveTextContent(message);
      await userEvent.click(banner.querySelector('button') as HTMLElement);
      const inbox = within(
        await screen.findByRole('dialog', { name: 'Inbox' }),
      );
      await userEvent.click(inbox.getByRole('button', { name: 'Close' }));
      await waitFor(() => expect(banner).not.toBeInTheDocument(), {
        timeout: 2000,
      });
    }

    refreshInbox();
    await new Promise((resolve) => setTimeout(resolve, 800));
    await expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  },
};

export const FreeBannerHidesNames: Story = {
  decorators: [
    (Story) => {
      stubNotifications(false);
      return <Story />;
    },
  ],
  play: async () => {
    await screen.findByRole('navigation');

    refreshInbox();

    const banner = await screen.findByRole('alert');
    await expect(banner).toHaveTextContent('A user copied your username');
    await expect(banner).toHaveTextContent('See who it was with Supporter');
    await expect(banner).not.toHaveTextContent('xhev');
  },
};

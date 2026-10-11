import type { Meta, StoryObj } from '@storybook/react';
import {
  expect,
  fn,
  screen,
  userEvent,
  waitFor,
  within,
} from '@storybook/test';
import { RouteProgressProvider } from '@/features/Navigation/RouteProgress';
import { Inbox } from './Inbox';
import { InboxPage } from './InboxPage';
import type { StoredNotification } from './notificationRequests';

const realFetch = window.fetch;
const reads = fn();
const writes: {
  method: string;
  body: { id?: string; read?: boolean; all?: boolean };
  finish: (ok?: boolean) => void;
}[] = [];

const stubWrites = () => {
  reads.mockClear();
  writes.length = 0;
  let notifications: StoredNotification[] = [
    {
      id: 'first',
      kind: 'copy',
      actorName: 'Mina',
      read: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'second',
      kind: 'share',
      actorName: 'Sophie',
      read: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'notice',
      kind: 'warning',
      read: false,
      createdAt: new Date().toISOString(),
    },
  ];
  window.fetch = (async (input, init) => {
    if (!String(input).includes('/api/notifications'))
      return realFetch(input, init);
    if (!init?.method) {
      reads();
      return Response.json({ premium: true, notifications });
    }
    const body = JSON.parse(init.body as string);
    return new Promise<Response>((resolve) => {
      writes.push({
        method: init.method as string,
        body,
        finish: (ok = true) => {
          if (ok) {
            if (init.method === 'DELETE') {
              notifications = notifications.filter(
                (n) => n.kind === 'warning' || (!body.all && n.id !== body.id),
              );
            } else {
              notifications = notifications.map((n) =>
                n.kind !== 'warning' && (body.all || n.id === body.id)
                  ? { ...n, read: body.all ? true : body.read }
                  : n,
              );
            }
          }
          resolve(new Response(null, { status: ok ? 204 : 503 }));
        },
      });
    });
  }) as typeof fetch;
};

const refreshInbox = () =>
  window.dispatchEvent(
    new CustomEvent('polycord:inbox-changed', { detail: 'story' }),
  );
const waitForWrites = (count: number) =>
  waitFor(() => expect(writes).toHaveLength(count));
const row = (message: string) =>
  within(screen.getByText(message).closest('.InboxRow') as HTMLElement);
const openInbox = async () => {
  await userEvent.click(
    await screen.findByRole('button', { name: 'Notifications' }),
  );
  await screen.findByText('Mina copied your username');
};

const meta: Meta<typeof Inbox> = {
  title: 'Components/InboxWrites',
  component: Inbox,
  args: { notifications: [] },
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/en/inbox' } },
  },
  decorators: [
    (Story) => {
      stubWrites();
      return (
        <RouteProgressProvider>
          <Story />
        </RouteProgressProvider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof Inbox>;

export const ConcurrentReads: Story = {
  play: async () => {
    await openInbox();
    const first = row('Mina copied your username');
    const second = row('Sophie shared your profile');
    await userEvent.click(first.getByRole('button', { name: 'Mark as read' }));
    await waitForWrites(1);
    await expect(
      first.getByRole('button', { name: 'Mark as unread' }),
    ).toBeEnabled();
    await expect(
      second.getByRole('button', { name: 'Mark as read' }),
    ).toBeEnabled();
    await expect(
      screen.getByRole('button', { name: 'Mark all as read' }),
    ).toBeEnabled();
    await expect(
      screen.getByRole('button', { name: 'Clear all' }),
    ).toBeEnabled();
    await userEvent.click(second.getByRole('button', { name: 'Mark as read' }));
    await waitForWrites(2);
    await expect(screen.getAllByRole('img', { name: 'Unread' })).toHaveLength(
      1,
    );

    await expect(
      screen.getByRole('button', { name: 'Mark all as read' }),
    ).toBeDisabled();
    const readCount = reads.mock.calls.length;
    refreshInbox();
    await expect(reads).toHaveBeenCalledTimes(readCount);
    writes[1].finish();
    writes[0].finish(false);
    await screen.findByRole('alert');
    await waitFor(() =>
      expect(first.getByRole('button', { name: 'Mark as read' })).toBeEnabled(),
    );
    await expect(
      second.getByRole('button', { name: 'Mark as unread' }),
    ).toBeEnabled();
    await waitFor(() => expect(reads).toHaveBeenCalledTimes(readCount + 1));
    await expect(screen.getAllByRole('img', { name: 'Unread' })).toHaveLength(
      2,
    );

    await userEvent.click(first.getByRole('button', { name: 'Mark as read' }));
    await waitForWrites(3);
    await expect(screen.queryByRole('alert')).toBeNull();
    writes[2].finish();
    await expect(screen.getAllByRole('img', { name: 'Unread' })).toHaveLength(
      1,
    );
  },
};

export const RapidReadToggles: Story = {
  play: async () => {
    await openInbox();
    const first = row('Mina copied your username');
    const second = row('Sophie shared your profile');
    await userEvent.click(first.getByRole('button', { name: 'Mark as read' }));
    await waitForWrites(1);
    await userEvent.click(
      first.getByRole('button', { name: 'Mark as unread' }),
    );
    await expect(writes).toHaveLength(1);
    await userEvent.click(
      screen.getByRole('button', { name: 'Mark all as read' }),
    );
    await expect(screen.getAllByRole('img', { name: 'Unread' })).toHaveLength(
      1,
    );
    await userEvent.click(
      second.getByRole('button', { name: 'Mark as unread' }),
    );
    await expect(writes).toHaveLength(1);

    writes[0].finish();
    await waitForWrites(2);
    await expect(writes[1].body).toEqual({ id: 'first', read: false });
    await expect(
      first.getByRole('button', { name: 'Mark as unread' }),
    ).toBeEnabled();
    writes[1].finish();
    await waitForWrites(3);
    await expect(writes[2].body).toEqual({ all: true });
    writes[2].finish();
    await waitForWrites(4);
    await expect(writes[3].body).toEqual({ id: 'second', read: false });
    const readCount = reads.mock.calls.length;
    refreshInbox();
    writes[3].finish();
    await waitFor(() => expect(reads).toHaveBeenCalledTimes(readCount + 1));
    await expect(
      first.getByRole('button', { name: 'Mark as unread' }),
    ).toBeEnabled();
    await expect(
      second.getByRole('button', { name: 'Mark as read' }),
    ).toBeEnabled();
    await expect(screen.getAllByRole('img', { name: 'Unread' })).toHaveLength(
      2,
    );
  },
};

export const BulkReadFailure: Story = {
  play: async () => {
    await openInbox();
    const first = row('Mina copied your username');
    const second = row('Sophie shared your profile');
    await userEvent.click(first.getByRole('button', { name: 'Mark as read' }));
    await waitForWrites(1);
    await userEvent.click(
      screen.getByRole('button', { name: 'Mark all as read' }),
    );
    await expect(
      second.getByRole('button', { name: 'Mark as unread' }),
    ).toBeEnabled();
    writes[0].finish();
    await waitForWrites(2);
    writes[1].finish(false);
    await screen.findByRole('alert');
    await expect(
      first.getByRole('button', { name: 'Mark as unread' }),
    ).toBeEnabled();
    await expect(
      second.getByRole('button', { name: 'Mark as read' }),
    ).toBeEnabled();
    await expect(screen.getAllByRole('img', { name: 'Unread' })).toHaveLength(
      2,
    );
  },
};

export const MobileReadsAndDelete: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  render: () => <InboxPage />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole('button', { name: /Mina copied your username/ }),
    );
    await waitForWrites(1);
    let sheet = within(await screen.findByRole('dialog'));
    await expect(
      sheet.getByRole('button', { name: 'Mark as unread' }),
    ).toBeEnabled();
    await expect(sheet.getByRole('button', { name: 'Delete' })).toBeEnabled();
    await userEvent.click(sheet.getByRole('button', { name: 'Close' }));
    await userEvent.click(
      await canvas.findByRole('button', { name: /Sophie shared your profile/ }),
    );
    await waitForWrites(2);
    sheet = within(await screen.findByRole('dialog'));
    await userEvent.click(sheet.getByRole('button', { name: 'Close' }));
    await expect(
      await canvas.findByRole('button', { name: 'Clear all' }),
    ).toBeEnabled();
    await expect(canvas.getAllByText('Unread')).toHaveLength(1);
    await userEvent.click(canvas.getByRole('button', { name: 'Clear all' }));
    await expect(writes).toHaveLength(2);
    writes[0].finish();
    writes[1].finish();
    await waitForWrites(3);
    await expect(writes[2].method).toBe('DELETE');
    writes[2].finish();
    await waitFor(() =>
      expect(
        canvas.queryByRole('button', { name: /Mina copied your username/ }),
      ).toBeNull(),
    );
    await expect(
      canvas.queryByRole('button', { name: /Sophie shared your profile/ }),
    ).toBeNull();
    await expect(
      canvas.getByRole('button', { name: /Note from moderation/ }),
    ).toBeInTheDocument();
  },
};

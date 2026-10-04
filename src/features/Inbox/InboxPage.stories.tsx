import type { Meta, StoryObj } from '@storybook/react';
import { expect, screen, userEvent, waitFor, within } from '@storybook/test';
import { MOCK_USER_AVATAR_URL } from '@/constants/mock-data';
import { RouteProgressProvider } from '@/features/Navigation/RouteProgress';
import type { Notifications } from '@/types';
import { InboxPage } from './InboxPage';

const notifications: Notifications = [
  {
    id: '1',
    kind: 'copy',
    actorName: 'Mina Park',
    actorAvatarUrl: MOCK_USER_AVATAR_URL,
    actorProfileId: '11111111-1111-4111-8111-111111111111',
    createdAt: new Date(Date.now() - 3 * 60000).toISOString(),
  },
  {
    id: '2',
    kind: 'view',
    actorName: 'Sophie Laurent',
    actorAvatarUrl: MOCK_USER_AVATAR_URL,
    createdAt: new Date(Date.now() - 26 * 60000).toISOString(),
  },
  {
    id: '3',
    kind: 'copy',
    isGuest: true,
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: '4',
    kind: 'warning',
    createdAt: new Date(Date.now() - 26 * 3600000).toISOString(),
  },
];

const meta: Meta<typeof InboxPage> = {
  title: 'Components/InboxPage',
  component: InboxPage,
  decorators: [
    (Story) => (
      <RouteProgressProvider>
        <Story />
      </RouteProgressProvider>
    ),
  ],
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/en/inbox' } },
    viewport: { defaultViewport: 'mobile1' },
  },
  args: { notifications, persist: false },
};

export default meta;
type Story = StoryObj<typeof InboxPage>;

export const Free: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole('heading', { name: 'Inbox' }),
    ).toBeInTheDocument();
    await expect(
      canvas.getAllByText('A user copied your username'),
    ).toHaveLength(2);
    await expect(
      canvas.queryByText('Sophie Laurent viewed your profile'),
    ).not.toBeInTheDocument();
    await expect(
      canvas.getByRole('link', { name: /See who it was with Supporter/ }),
    ).toHaveAttribute('href', '/en/settings#supporter');
    await expect(canvas.getAllByText('Unread')).toHaveLength(3);

    await userEvent.click(
      canvas.getByRole('button', { name: 'Mark all as read' }),
    );
    await waitFor(() =>
      expect(canvas.queryAllByText('Unread')).toHaveLength(0),
    );
    await expect(
      canvas.getByRole('button', { name: 'Mark all as read' }),
    ).toBeDisabled();
  },
};

export const Supporter: Story = {
  args: { premium: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByText('Sophie Laurent viewed your profile'),
    ).toBeInTheDocument();
    await expect(
      canvas.queryByRole('link', { name: /See who it was with Supporter/ }),
    ).not.toBeInTheDocument();

    await userEvent.click(
      canvas.getByRole('button', { name: /Mina Park copied your username/ }),
    );
    const sheet = within(await screen.findByRole('dialog'));
    await expect(
      sheet.getByRole('button', { name: 'View profile' }),
    ).toBeInTheDocument();
    await userEvent.click(
      sheet.getByRole('button', { name: 'Mark as unread' }),
    );
    await waitFor(() => expect(canvas.getAllByText('Unread')).toHaveLength(4));

    await userEvent.click(
      canvas.getByRole('button', { name: /Sophie Laurent viewed/ }),
    );
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Delete',
      }),
    );
    await waitFor(() =>
      expect(
        canvas.queryByText('Sophie Laurent viewed your profile'),
      ).not.toBeInTheDocument(),
    );
  },
};

export const Empty: Story = {
  args: { notifications: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole('heading', { name: 'No notifications yet' }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: 'Mark all as read' }),
    ).toBeDisabled();
    await expect(
      canvas.queryByRole('button', { name: 'Clear all' }),
    ).not.toBeInTheDocument();
  },
};

export const ModerationNote: Story = {
  args: {
    notifications: [
      {
        id: 'notice',
        kind: 'warning',
        warningCategory: 'harassment',
        message: 'Harassment',
        createdAt: new Date(Date.now() - 3 * 60000).toISOString(),
      },
      ...notifications.slice(0, 2),
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const row = canvas.getByRole('button', { name: /Note from moderation/ });
    await expect(within(row).getByText('Read warning')).toBeInTheDocument();
    await expect(within(row).getByText('Unread')).toBeInTheDocument();
    await userEvent.click(row);
    await expect(screen.queryByRole('dialog')).toBeNull();
    await expect(
      canvas.getByRole('button', { name: /Note from moderation/ }),
    ).toBeInTheDocument();
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      window.innerWidth,
    );
  },
};

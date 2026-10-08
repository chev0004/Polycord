import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, within } from '@storybook/test';
import { useTranslations } from 'next-intl';
import { MOCK_USER_AVATAR_URL } from '@/constants/mock-data';
import { RouteProgressProvider } from '@/features/Navigation/RouteProgress';
import { Navbar } from './Navbar';

const meta: Meta<typeof Navbar> = {
  title: 'Components/Navbar',
  component: Navbar,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/en',
      },
    },
  },
  decorators: [
    (Story) => (
      <RouteProgressProvider>
        <Story />
      </RouteProgressProvider>
    ),
  ],
  args: {
    onLoginClick: fn(),
    onProfileClick: fn(),
    onBumpProfileClick: fn(),
    onSettingsClick: fn(),
    onLogoutClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Navbar>;

export const LoggedIn: Story = {
  render: (args) => {
    const LoggedInStory = () => {
      const t = useTranslations('Inbox');
      return (
        <Navbar
          {...args}
          iconUrl={MOCK_USER_AVATAR_URL}
          isLoggedIn
          premium
          persistNotifications={false}
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
    return <LoggedInStory />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const logo = canvasElement.querySelector('img[src*="polycord-wordmark"]');
    await expect(logo).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: 'Polycord' }),
    ).toBeInTheDocument();
    await expect(
      canvas.queryByRole('link', { name: /^Admin/ }),
    ).not.toBeInTheDocument();
  },
};

export const Staff: Story = {
  render: (args) => (
    <Navbar
      {...args}
      iconUrl={MOCK_USER_AVATAR_URL}
      isLoggedIn
      notifications={[{ id: '1', kind: 'copy', isGuest: true }]}
      persistNotifications={false}
      pendingCases={3}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const admin = canvas.getByRole('link', {
      name: 'Admin, 3 pending cases',
    });
    await expect(admin).toHaveAttribute('href', '/en/admin');
    await expect(admin).toHaveTextContent('3');
    await expect(getComputedStyle(admin).textTransform).toBe('none');

    const language = await canvas.findByRole('button', {
      name: 'Change language',
    });
    await expect(
      admin.compareDocumentPosition(language) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const inbox = await canvas.findByRole('button', {
      name: 'Notifications',
    });
    const icon = inbox.querySelector('svg');
    const badge = inbox.querySelector('span span');
    await expect(badge).toHaveTextContent('1');
    const iconRect = icon?.getBoundingClientRect();
    const badgeRect = badge?.getBoundingClientRect();
    await expect(Math.round(iconRect?.top ?? 0) - 5).toBe(
      Math.round(badgeRect?.top ?? 0),
    );
    await expect(Math.round(badgeRect?.right ?? 0) - 6).toBe(
      Math.round(iconRect?.right ?? 0),
    );
  },
};

export const StaffNoPending: Story = {
  render: (args) => (
    <Navbar
      {...args}
      iconUrl={MOCK_USER_AVATAR_URL}
      isLoggedIn
      notifications={[]}
      persistNotifications={false}
      pendingCases={0}
    />
  ),
  play: async ({ canvasElement }) => {
    const admin = within(canvasElement).getByRole('link', { name: 'Admin' });
    await expect(admin).not.toHaveTextContent('0');
  },
};

export const StaffMobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  render: (args) => (
    <Navbar
      {...args}
      iconUrl={MOCK_USER_AVATAR_URL}
      isLoggedIn
      dockable
      notifications={[]}
      persistNotifications={false}
      pendingCases={12}
    />
  ),
  play: async ({ canvasElement }) => {
    const admin = within(canvasElement).getByRole('link', {
      name: 'Admin, 12 pending cases',
    });
    await expect(admin).toBeVisible();
    await expect(admin.getBoundingClientRect().width).toBe(44);
  },
};

export const LoggedOut: Story = {
  render: (args) => {
    return (
      <Navbar
        {...args}
        iconUrl={undefined}
        isLoggedIn={false}
        notifications={[]}
        persistNotifications={false}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole('button', { name: /discord/i }),
    ).toBeInTheDocument();
  },
};

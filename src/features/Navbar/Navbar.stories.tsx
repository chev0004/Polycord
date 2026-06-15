import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, within } from '@storybook/test';
import { useTranslations } from 'next-intl';
import { MOCK_USER_AVATAR_URL } from '@/constants/mock-data';
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

    const logo = canvasElement.querySelector('img[src*="polycord-logo"]');
    await expect(logo).toBeInTheDocument();
    await expect(canvas.getByText('Polycord')).toBeInTheDocument();
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

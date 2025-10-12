import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { useTranslations } from 'next-intl';
import { MOCK_USER_AVATAR_URL } from '@/constants/mock-data';
import { Navbar } from './Navbar';

const meta: Meta<typeof Navbar> = {
  title: 'Components/Navbar',
  component: Navbar,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    onLoginClick: fn(),
    onProfileClick: fn(),
    onSettingsClick: fn(),
    onLogoutClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Navbar>;

export const LoggedIn: Story = {
  render: (args) => {
    const t = useTranslations('Inbox');
    return (
      <Navbar
        {...args}
        iconUrl={MOCK_USER_AVATAR_URL}
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
            iconUrl: MOCK_USER_AVATAR_URL,
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

export const LoggedOut: Story = {
  render: (args) => {
    const _t = useTranslations();
    return <Navbar {...args} notifications={[]} iconUrl={undefined} />;
  },
};

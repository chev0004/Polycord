import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { useTranslations } from 'next-intl';
import { Navbar } from './Navbar';

const meta: Meta<typeof Navbar> = {
  title: 'Components/Navbar',
  component: Navbar,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof Navbar>;

export const LoggedIn: Story = {
  render: () => {
    const t = useTranslations('Inbox');
    return (
      <Navbar
        iconUrl="https://cdn.discordapp.com/avatars/559278744330698752/05acb5001d40db956558f9cfdbe6414d.webp?size=1024"
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
        onClick={fn()}
        loginText=""
      />
    );
  },
};

export const LoggedOut: Story = {
  render: () => {
    const t = useTranslations();
    return (
      <Navbar
        notifications={[]}
        onClick={fn()}
        loginText={t('loginWithDiscord')}
      />
    );
  },
};

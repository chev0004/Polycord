import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
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
  args: {
    iconUrl:
      'https://cdn.discordapp.com/guilds/1265539349030768650/users/559278744330698752/avatars/05acb5001d40db956558f9cfdbe6414d.webp?size=1024',
    notifications: [
      {
        id: '1',
        message: 'An anonymous user has copied your username',
        timestamp: '2 minutes ago',
      },
      {
        id: '2',
        message: 'xhev has copied your username',
        timestamp: '1 hour ago',
        iconUrl:
          'https://cdn.discordapp.com/guilds/1265539349030768650/users/559278744330698752/avatars/05acb5001d40db956558f9cfdbe6414d.webp?size=1024',
      },
      {
        id: '3',
        message: 'An anonymous user has copied your username',
        timestamp: '2 hours ago',
      },
    ],
  },
};

export const LoggedOut: Story = {
  args: {
    onClick: fn(),
  },
};

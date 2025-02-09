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
      'https://cdn.discordapp.com/avatars/559278744330698752/9c1889761120a1aafb106df8fc21222f.webp?size=2048',
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
          'https://cdn.discordapp.com/avatars/559278744330698752/9c1889761120a1aafb106df8fc21222f.webp?size=2048',
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

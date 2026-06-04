import type { Meta, StoryObj } from '@storybook/react';
import { DiscoveryPage } from './DiscoveryPage';

const meta: Meta<typeof DiscoveryPage> = {
  title: 'Discovery/DiscoveryPage',
  component: DiscoveryPage,
  args: {
    isLoggedIn: false,
    locale: 'en',
  },
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
};

export default meta;
type Story = StoryObj<typeof DiscoveryPage>;

export const LoggedOutEmpty: Story = {};

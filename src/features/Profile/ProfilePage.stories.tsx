import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ProfilePage } from './ProfilePage';

const meta: Meta<typeof ProfilePage> = {
  title: 'Features/Profile/ProfilePage',
  component: ProfilePage,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-background-main">
        <Story />
      </div>
    ),
  ],
  args: {
    onSubmit: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ProfilePage>;

export const Default: Story = {
  args: {},
};

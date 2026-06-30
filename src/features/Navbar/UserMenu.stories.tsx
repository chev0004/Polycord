import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, screen, userEvent, within } from '@storybook/test';
import { MOCK_USER_AVATAR_URL } from '@/constants/mock-data';
import { UserMenu } from './UserMenu';

const meta: Meta<typeof UserMenu> = {
  title: 'Components/UserMenu',
  component: UserMenu,
  args: {
    iconUrl: MOCK_USER_AVATAR_URL,
    onProfileClick: fn(),
    onBumpProfileClick: fn(),
    onActivityClick: fn(),
    onSettingsClick: fn(),
    onLogoutClick: fn(),
  },
  decorators: [
    (Story) => (
      <div className="flex justify-end bg-background-darker p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof UserMenu>;

export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = await canvas.findByRole('button');

    await userEvent.click(trigger);

    await expect(await screen.findByText('Profile')).toBeInTheDocument();
    await expect(await screen.findByText('Your activity')).toBeInTheDocument();
    await expect(await screen.findByText('Settings')).toBeInTheDocument();
    await expect(await screen.findByText('Logout')).toBeInTheDocument();

    const bump = await screen.findByText('Bump profile');
    await userEvent.click(bump);
    await expect(args.onBumpProfileClick).toHaveBeenCalled();
  },
};

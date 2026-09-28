import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, screen, userEvent, waitFor } from '@storybook/test';
import { MOCK_USER_AVATAR_URL } from '@/constants/mock-data';
import { MobileDock } from './MobileDock';

const meta: Meta<typeof MobileDock> = {
  title: 'Navigation/MobileDock',
  component: MobileDock,
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/en' } },
    viewport: { defaultViewport: 'mobile1' },
  },
  args: {
    locale: 'en',
    userAvatarUrl: MOCK_USER_AVATAR_URL,
    onNavigate: fn(),
    onBump: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof MobileDock>;

const openMenu = async () => {
  const avatar = await screen.findByRole('button', { name: 'Your Card' });
  await expect(avatar).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(avatar);
  await expect(avatar).toHaveAttribute('aria-expanded', 'true');
  return screen.findByRole('dialog', { name: 'Your Card' });
};

export const ProfileMenu: Story = {
  play: async ({ args }) => {
    await openMenu();
    await expect(args.onNavigate).not.toHaveBeenCalled();
    await expect(
      screen.getByRole('button', { name: 'My profile' }),
    ).toBeInTheDocument();
    await expect(
      screen.getByRole('button', { name: 'Saved profiles' }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'My profile' }));
    await waitFor(() =>
      expect(args.onNavigate).toHaveBeenCalledWith('/en/profile'),
    );

    await openMenu();
    await userEvent.click(
      screen.getByRole('button', { name: 'Saved profiles' }),
    );
    await waitFor(() =>
      expect(args.onNavigate).toHaveBeenCalledWith('/en/saved'),
    );

    await openMenu();
    await userEvent.click(screen.getByRole('button', { name: 'Bump profile' }));
    await waitFor(() => expect(args.onBump).toHaveBeenCalledOnce());

    await openMenu();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await expect(args.onNavigate).toHaveBeenCalledTimes(2);
    await expect(args.onBump).toHaveBeenCalledOnce();
  },
};

export const BumpCoolingDown: Story = {
  args: {
    bumpReadyAt: new Date(Date.now() + 90 * 60000).toISOString(),
  },
  play: async ({ args }) => {
    await openMenu();
    const bump = screen.getByRole('button', { name: /^Bump in 01:/ });
    await expect(bump).toBeDisabled();
    await userEvent.click(bump);
    await expect(args.onBump).not.toHaveBeenCalled();
  },
};

export const WithoutBump: Story = {
  args: { onBump: undefined },
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/en/inbox' } },
  },
  play: async () => {
    await openMenu();
    await expect(
      screen.getByRole('button', { name: 'Saved profiles' }),
    ).toBeInTheDocument();
    await expect(
      screen.queryByRole('button', { name: /Bump/ }),
    ).not.toBeInTheDocument();
  },
};

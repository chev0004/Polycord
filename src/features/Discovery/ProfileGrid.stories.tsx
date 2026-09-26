import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, waitFor, within } from '@storybook/test';
import { useTranslations } from 'next-intl';
import { ProfileGrid } from './ProfileGrid';
import { createSampleProfiles } from './profileFixtures';
import 'src/app/globals.css';

const meta: Meta<typeof ProfileGrid> = {
  title: 'Discovery/ProfileGrid',
  component: ProfileGrid,
  args: {
    onCopyUsername: fn(),
    onTagClick: fn(),
    onLanguageClick: fn(),
    onCountryClick: fn(),
    onViewProfile: fn(),
    onReport: fn(),
    onBlock: fn(),
    onShare: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ProfileGrid>;

export const Default: Story = {
  args: {
    isLoggedIn: true,
  },

  render: (args) => {
    const t = useTranslations('DiscoveryStories');

    return <ProfileGrid {...args} profiles={createSampleProfiles(t)} />;
  },
};

export const OwnProfileCopy: Story = {
  args: {
    isLoggedIn: true,
    currentProfileId: 'profile-1',
  },

  render: (args) => {
    const t = useTranslations('DiscoveryStories');

    return <ProfileGrid {...args} profiles={createSampleProfiles(t)} />;
  },

  play: async ({ args, canvasElement }) => {
    const view = canvasElement.ownerDocument.defaultView as Window;
    const beacon = fn(() => true);
    Object.defineProperty(view.navigator, 'clipboard', {
      value: { writeText: async () => {} },
      configurable: true,
    });
    Object.defineProperty(view.navigator, 'sendBeacon', {
      value: beacon,
      configurable: true,
    });
    const canvas = within(canvasElement);
    const card = (name: string) =>
      within(canvas.getAllByText(name)[0].closest('article') as HTMLElement);

    await userEvent.click(
      card('Yuki').getByRole('button', { name: 'Copy username' }),
    );
    await expect(await card('Yuki').findByText('Copied!')).toBeInTheDocument();
    await expect(beacon).not.toHaveBeenCalled();
    await expect(args.onCopyUsername).not.toHaveBeenCalled();

    await userEvent.click(
      card('Carlos').getByRole('button', { name: 'Copy username' }),
    );
    await waitFor(() =>
      expect(args.onCopyUsername).toHaveBeenCalledWith(
        'carlos_ba',
        'profile-2',
      ),
    );
    await expect(beacon).toHaveBeenCalledTimes(1);
  },
};

export const EmptyState: Story = {
  render: (args) => {
    return <ProfileGrid {...args} profiles={[]} />;
  },
};

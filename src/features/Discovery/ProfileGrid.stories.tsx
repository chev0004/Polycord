import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
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

export const EmptyState: Story = {
  render: (args) => {
    return <ProfileGrid {...args} profiles={[]} />;
  },
};

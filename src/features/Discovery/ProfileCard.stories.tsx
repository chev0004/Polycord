import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { useTranslations } from 'next-intl';
import { Proficiency } from '@/constants';
import { ProfileCard, type DiscoveryProfile } from './ProfileCard';
import 'src/app/globals.css';

const meta: Meta<typeof ProfileCard> = {
  title: 'Discovery/ProfileCard',
  component: ProfileCard,
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
type Story = StoryObj<typeof ProfileCard>;

const createMockProfile = (t: ReturnType<typeof useTranslations>) =>
  ({
    id: '1',
    displayName: 'User 1',
    discordUsername: 'user1',
    avatarUrl: undefined,
    primaryLanguage: 'ja',
    primaryLanguageLevel: undefined,
    targetLanguages: [
      {
        language: 'en',
        level: Proficiency.ADVANCED,
        goal: t('goalConversation'),
      },
      {
        language: 'ko',
        level: Proficiency.BEGINNER,
        goal: t('goalGrammar'),
      },
    ],
    about:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    interests: ['Anime', 'K-Pop', 'Gaming'],
    country: 'Japan',
    timezone: 'Asia/Tokyo',
    allowAnonymousCopy: true,
    lastBumpRelative: t('bumpTwoDays'),
  }) satisfies DiscoveryProfile;

export const Default: Story = {
  render: (args) => {
    const t = useTranslations('DiscoveryStories');
    return <ProfileCard {...args} profile={createMockProfile(t)} />;
  },
};

export const AnonymousCopyDisabled: Story = {
  render: (args) => {
    const t = useTranslations('DiscoveryStories');
    const profile: DiscoveryProfile = {
      ...createMockProfile(t),
      allowAnonymousCopy: false,
    };

    return <ProfileCard {...args} profile={profile} isLoggedIn={false} />;
  },
};

export const AnonymousCopyDisabledLoggedIn: Story = {
  render: (args) => {
    const t = useTranslations('DiscoveryStories');
    const profile: DiscoveryProfile = {
      ...createMockProfile(t),
      allowAnonymousCopy: false,
    };

    return <ProfileCard {...args} profile={profile} isLoggedIn={true} />;
  },
};

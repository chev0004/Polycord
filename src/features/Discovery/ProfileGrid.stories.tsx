import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { useTranslations } from 'next-intl';
import { Proficiency } from '@/constants';
import type { DiscoveryProfile } from './ProfileCard';
import { ProfileGrid } from './ProfileGrid';
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

const createMockProfiles = (t: ReturnType<typeof useTranslations>) =>
  [
    {
      id: 'profile-1',
      displayName: 'User 1',
      discordUsername: 'user1',
      avatarUrl: undefined,
      primaryLanguage: 'ja',
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
        {
          language: 'zh',
          level: Proficiency.INTERMEDIATE,
        },
        {
          language: 'fr',
          level: Proficiency.BEGINNER,
        },
        {
          language: 'es',
          level: Proficiency.BEGINNER,
        },
        {
          language: 'de',
          level: Proficiency.INTERMEDIATE,
        },
      ],
      about:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      interests: ['Anime', 'K-Pop', 'Gaming'],
      country: 'Japan',
      timezone: 'Asia/Tokyo',
      allowAnonymousCopy: true,
      lastBumpRelative: t('bumpTwoDays'),
    },
    {
      id: 'profile-2',
      displayName: 'User 2',
      discordUsername: 'user2',
      avatarUrl: undefined,
      primaryLanguage: 'es',
      targetLanguages: [
        {
          language: 'en',
          level: Proficiency.INTERMEDIATE,
          goal: t('goalBusiness'),
        },
      ],
      about:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      interests: ['Programming', 'Football', 'Music'],
      country: 'Argentina',
      timezone: 'America/Argentina/Buenos_Aires',
      allowAnonymousCopy: false,
      lastBumpRelative: t('bumpOneWeek'),
    },
    {
      id: 'profile-3',
      displayName: 'User 3',
      discordUsername: 'user3',
      avatarUrl: undefined,
      primaryLanguage: 'zh',
      targetLanguages: [
        {
          language: 'fr',
          level: Proficiency.ADVANCED,
          goal: t('goalExam'),
        },
        {
          language: 'en',
          level: Proficiency.ADVANCED,
        },
        {
          language: 'ja',
          level: Proficiency.INTERMEDIATE,
        },
        {
          language: 'ko',
          level: Proficiency.BEGINNER,
        },
        {
          language: 'de',
          level: Proficiency.INTERMEDIATE,
        },
        {
          language: 'it',
          level: Proficiency.BEGINNER,
        },
        {
          language: 'es',
          level: Proficiency.BEGINNER,
        },
      ],
      about:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      interests: ['Languages', 'K-Dramas', 'Food'],
      country: 'Singapore',
      timezone: 'Asia/Singapore',
      allowAnonymousCopy: true,
      lastBumpRelative: t('bumpFiveHours'),
    },
    {
      id: 'profile-4',
      displayName: 'User 4',
      discordUsername: 'user4',
      avatarUrl: undefined,
      primaryLanguage: 'it',
      targetLanguages: [
        {
          language: 'en',
          level: Proficiency.INTERMEDIATE,
          goal: t('goalConversation'),
        },
        {
          language: 'fr',
          level: Proficiency.BEGINNER,
        },
      ],
      about:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      interests: ['Art', 'Gaming', 'Cooking'],
      country: 'Italy',
      timezone: 'Europe/Rome',
      allowAnonymousCopy: true,
      lastBumpRelative: t('bumpFiveHours'),
    },
    {
      id: 'profile-5',
      displayName: 'User 5',
      discordUsername: 'user5',
      avatarUrl: undefined,
      primaryLanguage: 'en',
      targetLanguages: [
        {
          language: 'ja',
          level: Proficiency.INTERMEDIATE,
          goal: t('goalGrammar'),
        },
        {
          language: 'ko',
          level: Proficiency.BEGINNER,
        },
        {
          language: 'zh',
          level: Proficiency.BEGINNER,
        },
        {
          language: 'fr',
          level: Proficiency.INTERMEDIATE,
        },
        {
          language: 'es',
          level: Proficiency.BEGINNER,
        },
        {
          language: 'de',
          level: Proficiency.BEGINNER,
        },
        {
          language: 'it',
          level: Proficiency.BEGINNER,
        },
        {
          language: 'pt',
          level: Proficiency.BEGINNER,
        },
      ],
      about:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      interests: ['Anime', 'Gaming', 'Coding'],
      country: 'United States',
      timezone: 'America/New_York',
      allowAnonymousCopy: false,
      lastBumpRelative: t('bumpTwoDays'),
    },
    {
      id: 'profile-6',
      displayName: 'User 6',
      discordUsername: 'user6',
      avatarUrl: undefined,
      primaryLanguage: 'ar',
      targetLanguages: [
        {
          language: 'en',
          level: Proficiency.ADVANCED,
          goal: t('goalBusiness'),
        },
        {
          language: 'fr',
          level: Proficiency.INTERMEDIATE,
        },
      ],
      about:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      interests: ['Gaming', 'Travel', 'Photography'],
      country: 'Egypt',
      timezone: 'Africa/Cairo',
      allowAnonymousCopy: true,
      lastBumpRelative: t('bumpOneWeek'),
    },
    {
      id: 'profile-7',
      displayName: 'User 7',
      discordUsername: 'user7',
      avatarUrl: undefined,
      primaryLanguage: 'fr',
      targetLanguages: [
        {
          language: 'en',
          level: Proficiency.ADVANCED,
          goal: t('goalConversation'),
        },
        {
          language: 'es',
          level: Proficiency.BEGINNER,
        },
      ],
      about:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      interests: ['Movies', 'Books', 'Travel'],
      country: 'France',
      timezone: 'Europe/Paris',
      allowAnonymousCopy: true,
      lastBumpRelative: t('bumpFiveHours'),
    },
    {
      id: 'profile-8',
      displayName: 'User 8',
      discordUsername: 'user8',
      avatarUrl: undefined,
      primaryLanguage: 'ja',
      targetLanguages: [
        {
          language: 'en',
          level: Proficiency.INTERMEDIATE,
          goal: t('goalExam'),
        },
        {
          language: 'zh',
          level: Proficiency.BEGINNER,
        },
        {
          language: 'ko',
          level: Proficiency.INTERMEDIATE,
        },
        {
          language: 'fr',
          level: Proficiency.BEGINNER,
        },
        {
          language: 'es',
          level: Proficiency.BEGINNER,
        },
        {
          language: 'de',
          level: Proficiency.BEGINNER,
        },
      ],
      about:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      interests: ['Anime', 'Music', 'Studying'],
      country: 'Japan',
      timezone: 'Asia/Tokyo',
      allowAnonymousCopy: false,
      lastBumpRelative: t('bumpTwoDays'),
    },
    {
      id: 'profile-9',
      displayName: 'User 9',
      discordUsername: 'user9',
      avatarUrl: undefined,
      primaryLanguage: 'es',
      targetLanguages: [
        {
          language: 'en',
          level: Proficiency.ADVANCED,
          goal: t('goalBusiness'),
        },
        {
          language: 'pt',
          level: Proficiency.INTERMEDIATE,
        },
      ],
      about:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      interests: ['Gaming', 'Football', 'Food'],
      country: 'Mexico',
      timezone: 'America/Mexico_City',
      allowAnonymousCopy: true,
      lastBumpRelative: t('bumpOneWeek'),
    },
    {
      id: 'profile-10',
      displayName: 'User 10',
      discordUsername: 'user10',
      avatarUrl: undefined,
      primaryLanguage: 'de',
      targetLanguages: [
        {
          language: 'en',
          level: Proficiency.INTERMEDIATE,
          goal: t('goalConversation'),
        },
        {
          language: 'fr',
          level: Proficiency.BEGINNER,
        },
      ],
      about:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      interests: ['Coding', 'Gaming', 'Hiking'],
      country: 'Germany',
      timezone: 'Europe/Berlin',
      allowAnonymousCopy: true,
      lastBumpRelative: t('bumpFiveHours'),
    },
    {
      id: 'profile-11',
      displayName: 'User 11',
      discordUsername: 'user11',
      avatarUrl: undefined,
      primaryLanguage: 'hi',
      targetLanguages: [
        {
          language: 'en',
          level: Proficiency.ADVANCED,
          goal: t('goalGrammar'),
        },
        {
          language: 'ja',
          level: Proficiency.BEGINNER,
        },
        {
          language: 'ko',
          level: Proficiency.BEGINNER,
        },
        {
          language: 'zh',
          level: Proficiency.INTERMEDIATE,
        },
        {
          language: 'fr',
          level: Proficiency.BEGINNER,
        },
        {
          language: 'de',
          level: Proficiency.BEGINNER,
        },
        {
          language: 'es',
          level: Proficiency.BEGINNER,
        },
        {
          language: 'it',
          level: Proficiency.BEGINNER,
        },
        {
          language: 'pt',
          level: Proficiency.BEGINNER,
        },
      ],
      about:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      interests: ['Coding', 'Anime', 'Food'],
      country: 'India',
      timezone: 'Asia/Kolkata',
      allowAnonymousCopy: false,
      lastBumpRelative: t('bumpTwoDays'),
    },
  ] satisfies DiscoveryProfile[];

export const Default: Story = {
  args: {
    isLoggedIn: false,
  },

  render: (args) => {
    const t = useTranslations('DiscoveryStories');
    const discoveryT = useTranslations('Discovery');
    const profiles = createMockProfiles(t);

    return (
      <ProfileGrid
        {...args}
        profiles={profiles}
        emptyState={discoveryT('emptyStateDescription')}
        isLoggedIn={false}
      />
    );
  },
};

export const EmptyState: Story = {
  render: (args) => {
    return <ProfileGrid {...args} profiles={[]} />;
  },
};

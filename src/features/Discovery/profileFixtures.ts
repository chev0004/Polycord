import type { useTranslations } from 'next-intl';
import { Proficiency } from '@/constants';
import type { DiscoveryProfile } from './ProfileCard';

// Sample discovery profiles shared by the ProfileGrid and DiscoveryPage
// stories. Language codes, proficiency levels, and IANA timezones line up with
// the filter option values so story play functions can exercise filtering.
export const createSampleProfiles = (
  t: ReturnType<typeof useTranslations>,
): DiscoveryProfile[] => [
  {
    id: 'profile-1',
    displayName: 'Yuki',
    discordUsername: 'yuki_lang',
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
      'Hi! I love anime, J-pop, and exploring different cultures through language. Currently preparing for the IELTS exam while also dabbling in Korean dramas. I work as a software engineer in Tokyo and enjoy discussing technology, gaming, and creative writing. Always happy to help with Japanese grammar or kanji!',
    interests: ['Anime', 'K-Pop', 'Gaming', 'Coding', 'Creative Writing'],
    country: 'Japan',
    timezone: 'Asia/Tokyo',
    allowAnonymousCopy: true,
    lastBumpRelative: t('bumpTwoDays'),
  },
  {
    id: 'profile-2',
    displayName: 'Carlos',
    discordUsername: 'carlos_ba',
    avatarUrl: undefined,
    primaryLanguage: 'es',
    targetLanguages: [
      {
        language: 'en',
        level: Proficiency.INTERMEDIATE,
        goal: t('goalBusiness'),
      },
    ],
    about: 'Football fan from Buenos Aires. Looking for conversation partners!',
    interests: ['Football', 'Music'],
    country: 'Argentina',
    timezone: 'America/Argentina/Buenos_Aires',
    allowAnonymousCopy: false,
    lastBumpRelative: t('bumpOneWeek'),
  },
  {
    id: 'profile-3',
    displayName: 'Wei',
    discordUsername: 'wei_sg',
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
      'Multilingual enthusiast based in Singapore. I speak Mandarin, English, and French fluently and I am working on Japanese and Korean. I enjoy watching K-dramas and trying street food from different cultures.',
    interests: [
      'Languages',
      'K-Dramas',
      'Food',
      'Travel',
      'Photography',
      'History',
    ],
    country: 'Singapore',
    timezone: 'Asia/Singapore',
    allowAnonymousCopy: true,
    lastBumpRelative: t('bumpFiveHours'),
  },
  {
    id: 'profile-4',
    displayName: 'Giulia',
    discordUsername: 'giulia_roma',
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
    about: 'Art student. Love cooking and gaming.',
    interests: ['Art', 'Gaming', 'Cooking'],
    country: 'Italy',
    timezone: 'Europe/Rome',
    allowAnonymousCopy: true,
    lastBumpRelative: t('bumpFiveHours'),
  },
  {
    id: 'profile-5',
    displayName: 'Alex',
    discordUsername: 'alex_dev',
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
      'Full-stack developer from NYC. I am fascinated by East Asian languages and cultures. Working through Genki II for Japanese. Always down to chat about coding, anime, or language learning tips.',
    interests: ['Anime', 'Gaming', 'Coding'],
    country: 'United States',
    timezone: 'America/New_York',
    allowAnonymousCopy: false,
    lastBumpRelative: t('bumpTwoDays'),
  },
  {
    id: 'profile-6',
    displayName: 'Omar',
    discordUsername: 'omar_cairo',
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
      'Photographer and traveler. I have visited 30 countries and counting. Let us practice English or French together!',
    interests: ['Gaming', 'Travel', 'Photography'],
    country: 'Egypt',
    timezone: 'Africa/Cairo',
    allowAnonymousCopy: true,
    lastBumpRelative: t('bumpOneWeek'),
  },
  {
    id: 'profile-7',
    displayName: 'Marie',
    discordUsername: 'marie_paris',
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
    about: 'Bookworm and film buff.',
    interests: ['Movies', 'Books'],
    country: 'France',
    timezone: 'Europe/Paris',
    allowAnonymousCopy: true,
    lastBumpRelative: t('bumpFiveHours'),
  },
  {
    id: 'profile-8',
    displayName: 'Haruto',
    discordUsername: 'haruto_osaka',
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
      'Music producer and language nerd from Osaka. I make lo-fi beats and study languages in my free time. Currently focused on TOEIC prep. Happy to help anyone learning Japanese, especially Kansai dialect!',
    interests: ['Anime', 'Music', 'Studying', 'Lo-fi', 'Dialect'],
    country: 'Japan',
    timezone: 'Asia/Tokyo',
    allowAnonymousCopy: false,
    lastBumpRelative: t('bumpTwoDays'),
  },
  {
    id: 'profile-9',
    displayName: 'Sofia',
    discordUsername: 'sofia_mx',
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
    about: 'Foodie from Mexico City.',
    interests: ['Food'],
    country: 'Mexico',
    timezone: 'America/Mexico_City',
    allowAnonymousCopy: true,
    lastBumpRelative: t('bumpOneWeek'),
  },
];

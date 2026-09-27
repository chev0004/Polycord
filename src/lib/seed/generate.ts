import {
  type AvailabilityPattern,
  availabilityPatternToPreset,
} from '@/constants/availability';
import { Proficiency } from '@/constants/languages';
import type { NewProfile, NewUser } from '@/db/schema';

export const SEED_BATCH_SIZE = 2000;
export const SEED_ID_PREFIX = 'seed-';

const DAY_MS = 24 * 60 * 60 * 1000;

const FIRST_NAMES = [
  'Aiko',
  'Mateo',
  'Sofia',
  'Liam',
  'Haruto',
  'Camila',
  'Noah',
  'Yuna',
  'Lucas',
  'Mei',
  'Omar',
  'Chloe',
  'Diego',
  'Hana',
  'Elias',
  'Priya',
  'Jonas',
  'Lina',
  'Minjun',
  'Ines',
  'Arjun',
  'Emma',
  'Kenta',
  'Valentina',
  'Felix',
  'Zara',
  'Hugo',
  'Seo-yeon',
  'Rafael',
  'Anya',
];

const LAST_INITIALS = [...'ABCDEFGHIJKLMNOPRSTVWY'];

const PRIMARY_LANGUAGES = [
  'en',
  'en',
  'en',
  'en',
  'en',
  'ja',
  'ja',
  'ja',
  'es',
  'es',
  'es',
  'ko',
  'ko',
  'fr',
  'de',
  'zh',
  'pt',
  'it',
  'ru',
  'ar',
  'hi',
  'tr',
  'vi',
];

const TARGET_LANGUAGES = [
  'en',
  'en',
  'en',
  'ja',
  'ja',
  'ja',
  'ko',
  'ko',
  'es',
  'es',
  'fr',
  'de',
  'zh',
  'it',
  'pt',
];

const LEVELS = [
  Proficiency.BEGINNER,
  Proficiency.BEGINNER,
  Proficiency.INTERMEDIATE,
  Proficiency.INTERMEDIATE,
  Proficiency.ADVANCED,
  Proficiency.NATIVE_LEVEL,
];

const LOCATIONS: [string, string[]][] = [
  ['US', ['America/New_York', 'America/Chicago', 'America/Los_Angeles']],
  ['JP', ['Asia/Tokyo']],
  ['GB', ['Europe/London']],
  ['ES', ['Europe/Madrid']],
  ['MX', ['America/Mexico_City']],
  ['KR', ['Asia/Seoul']],
  ['FR', ['Europe/Paris']],
  ['DE', ['Europe/Berlin']],
  ['BR', ['America/Sao_Paulo']],
  ['CA', ['America/Toronto', 'America/Vancouver']],
  ['AU', ['Australia/Sydney', 'Australia/Perth']],
  ['CN', ['Asia/Shanghai']],
  ['IN', ['Asia/Kolkata']],
  ['IT', ['Europe/Rome']],
  ['TR', ['Europe/Istanbul']],
  ['VN', ['Asia/Ho_Chi_Minh']],
  ['AR', ['America/Argentina/Buenos_Aires']],
  ['EG', ['Africa/Cairo']],
];

const TAGS = [
  'Anime',
  'Gaming',
  'Cooking',
  'Travel',
  'Music',
  'Movies',
  'Reading',
  'Coding',
  'Photography',
  'Hiking',
  'Football',
  'Art',
  'Podcasts',
  'Business',
  'Fitness',
  'K-pop',
];

const BIO_OPENINGS = [
  'Looking for a patient partner to practice everyday conversation.',
  'Studying for an exam and want regular speaking practice.',
  'Happy to help with grammar in exchange for casual chats.',
  'Preparing to move abroad and want to sound more natural.',
  'I learn best through voice calls and short daily messages.',
];

const BIO_DETAILS = [
  'I usually talk about food, films and weekend plans.',
  'Corrections are welcome, I will return the favour.',
  'I can also share tips for learning vocabulary quickly.',
  'Mornings work best for me, but I am flexible.',
  'Let us swap book and music recommendations.',
  '',
];

const WINDOWS: [string, string][] = [
  ['18:00', '22:00'],
  ['06:00', '09:00'],
  ['12:00', '14:00'],
  ['20:00', '23:30'],
  ['22:00', '02:00'],
  ['09:00', '17:00'],
];

const DAYS: AvailabilityPattern['days'][] = [
  'any',
  'weekdays',
  'weekdays',
  'weekends',
];

const hash = (index: number, salt: number) => {
  let value = Math.imul(index ^ 0x5bd1e995, 0x27d4eb2d) + salt * 0x9e3779b9;
  value = Math.imul(value ^ (value >>> 15), 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35);
  return (value ^ (value >>> 16)) >>> 0;
};

const pick = <T>(list: readonly T[], index: number, salt: number) =>
  list[hash(index, salt) % list.length];

export const seedDiscordId = (index: number) =>
  `${SEED_ID_PREFIX}${String(index).padStart(6, '0')}`;

export const seedIndex = (discordUserId: string) =>
  Number(discordUserId.slice(SEED_ID_PREFIX.length));

const languagePair = (index: number) => {
  const primary = pick(PRIMARY_LANGUAGES, index, 1);
  const target = TARGET_LANGUAGES.filter((code) => code !== primary);
  return { primary, first: pick(target, index, 2) };
};

const targetsFor = (index: number, primary: string, first: string) => {
  const extras = TARGET_LANGUAGES.filter(
    (code) => code !== primary && code !== first,
  );
  const count = 1 + (hash(index, 3) % 3);
  const languages = [first];
  for (let salt = 4; languages.length < count; salt += 1) {
    const next = pick(extras, index, salt);
    if (!languages.includes(next)) languages.push(next);
  }
  return languages.map((language, position) => ({
    language,
    proficiencyLevel: pick(LEVELS, index, 10 + position),
    position,
  }));
};

const availabilityFor = (index: number): AvailabilityPattern | null => {
  const roll = hash(index, 20) % 20;
  if (roll < 3) return null;
  const days = pick(DAYS, index, 21);
  if (roll < 7) return { days, from: '', to: '', anyTime: true };
  const [from, to] = pick(WINDOWS, index, 22);
  return { days, from, to };
};

export type GeneratedDummy = {
  user: NewUser;
  profile: Omit<NewProfile, 'userId'>;
  targetLanguages: {
    language: string;
    proficiencyLevel: Proficiency;
    position: number;
  }[];
};

export const generateDummy = (index: number, now: Date): GeneratedDummy => {
  const partner = index % 10 === 2 ? languagePair(index - 1) : null;
  const { primary, first } = partner
    ? { primary: partner.first, first: partner.primary }
    : languagePair(index);
  const targetLanguages = targetsFor(index, primary, first);
  const [country, zones] = pick(LOCATIONS, index, 30);
  const timezone = index % 25 === 9 ? null : pick(zones, index, 31);
  const availability = timezone ? availabilityFor(index) : null;
  const tags = TAGS.filter((_, tag) => hash(index, 40 + tag) % 6 === 0).slice(
    0,
    5,
  );
  const bio = [pick(BIO_OPENINGS, index, 50), pick(BIO_DETAILS, index, 51)]
    .filter(Boolean)
    .join(' ');

  return {
    user: {
      discordUserId: seedDiscordId(index),
      discordUsername: `seed_${index}`,
      displayName: `${pick(FIRST_NAMES, index, 60)} ${pick(LAST_INITIALS, index, 61)}.`,
      isSynthetic: true,
    },
    profile: {
      isPublic: index % 40 !== 7,
      hiddenByModeration: index % 40 === 23,
      allowAnonymousCopy: index % 6 !== 0,
      displayTimezone: index % 15 !== 4,
      displayAvailability: index % 17 !== 5,
      primaryLanguage: primary,
      targetLanguage: targetLanguages[0].language,
      proficiencyLevel: targetLanguages[0].proficiencyLevel,
      bio,
      availability: availabilityPatternToPreset(availability),
      availabilityDays: availability?.days ?? null,
      availabilityFrom: availability?.anyTime
        ? null
        : (availability?.from ?? null),
      availabilityTo: availability?.anyTime ? null : (availability?.to ?? null),
      availabilityAnyTime: Boolean(availability?.anyTime),
      tags,
      country,
      timezone,
      lastBumpedAt: new Date(now.getTime() - (hash(index, 70) % (30 * DAY_MS))),
      boostedUntil:
        index % 100 === 0 ? new Date(now.getTime() + 7 * DAY_MS) : null,
    },
    targetLanguages,
  };
};

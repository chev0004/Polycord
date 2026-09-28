import {
  type AvailabilityPattern,
  availabilityPatternToPreset,
} from '@/constants/availability';
import { languages, Proficiency } from '@/constants/languages';
import type { NewProfile, NewUser } from '@/db/schema';
import {
  CUSTOM_CARD_THEME_ID,
  FREE_CARD_COLORS,
  PREMIUM_CARD_THEMES,
} from '@/features/Discovery/cardTheme';
import { entitlementLimit } from '@/lib/entitlements';

export const SEED_BATCH_SIZE = 2000;
export const SEED_ID_PREFIX = 'seed-';

export const SEED_SHARES = {
  premium: 25,
  premiumVoice: 25,
  premiumBoost: 12,
  premiumTheme: 40,
  premiumGradient: 20,
  premiumAccent: 25,
};

export const SEED_VOICES = [
  { file: 'intro-1.webm', seconds: 3 },
  { file: 'intro-2.webm', seconds: 5 },
  { file: 'intro-3.webm', seconds: 8 },
  { file: 'intro-4.webm', seconds: 10 },
  { file: 'intro-5.webm', seconds: 13 },
  { file: 'intro-6.webm', seconds: 18 },
] as const;

export type SeedVoice = (typeof SEED_VOICES)[number];

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const LANGUAGE_STRIDE = 50;
const TAG_STRIDE = 40;

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
  'Amara',
  'Bao',
  'Chidi',
  'Dalia',
  'Emre',
  'Freya',
  'Goran',
  'Hye-jin',
  'Ivan',
  'Jana',
  'Kofi',
  'Leila',
  'Marek',
  'Nadia',
  'Oskar',
  'Paula',
  'Quang',
  'Rania',
  'Sven',
  'Tomoko',
  'Umar',
  'Vera',
  'Wiremu',
  'Ximena',
  'Yusuf',
  'Zoltan',
  'Ayla',
  'Bruno',
  'Carmen',
  'Dmitri',
  'Esra',
  'Farah',
  'Giulia',
  'Hamid',
  'Ingrid',
  'Joao',
  'Kasia',
  'Lars',
  'Maya',
  'Nikos',
];

const LAST_INITIALS = [...'ABCDEFGHIJKLMNOPRSTVWY'];

const COMMON_LANGUAGES: Record<string, number> = {
  en: 60,
  ja: 36,
  es: 30,
  ko: 20,
  fr: 16,
  de: 14,
  zh: 14,
  pt: 10,
  it: 8,
  ru: 8,
  ar: 6,
  hi: 6,
  tr: 5,
  vi: 5,
  id: 4,
  th: 4,
  nl: 3,
  pl: 3,
  sv: 2,
  uk: 2,
};

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
  ['NG', ['Africa/Lagos']],
  ['KE', ['Africa/Nairobi']],
  ['ZA', ['Africa/Johannesburg']],
  ['ID', ['Asia/Jakarta']],
  ['TH', ['Asia/Bangkok']],
  ['PH', ['Asia/Manila']],
  ['NL', ['Europe/Amsterdam']],
  ['PL', ['Europe/Warsaw']],
  ['SE', ['Europe/Stockholm']],
  ['UA', ['Europe/Kyiv']],
  ['RU', ['Europe/Moscow', 'Asia/Vladivostok']],
  ['NZ', ['Pacific/Auckland']],
  ['CL', ['America/Santiago']],
  ['CO', ['America/Bogota']],
];

export const SEED_TAGS = [
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
  'Manga',
  'Baking',
  'Yoga',
  'Running',
  'Cycling',
  'Swimming',
  'Basketball',
  'Tennis',
  'Chess',
  'Board games',
  'Poetry',
  'Writing',
  'History',
  'Philosophy',
  'Science',
  'Astronomy',
  'Biology',
  'Chemistry',
  'Physics',
  'Mathematics',
  'Economics',
  'Politics',
  'Psychology',
  'Linguistics',
  'Design',
  'Fashion',
  'Makeup',
  'Skincare',
  'Gardening',
  'Camping',
  'Fishing',
  'Surfing',
  'Skiing',
  'Snowboarding',
  'Climbing',
  'Martial arts',
  'Boxing',
  'Dance',
  'Ballet',
  'Theatre',
  'Stand-up comedy',
  'Jazz',
  'Classical music',
  'Hip-hop',
  'Rock',
  'Metal',
  'Indie music',
  'EDM',
  'J-pop',
  'C-pop',
  'Latin music',
  'Guitar',
  'Piano',
  'Violin',
  'Drums',
  'Singing',
  'Karaoke',
  'Songwriting',
  'Film making',
  'Animation',
  'Drawing',
  'Painting',
  'Calligraphy',
  'Pottery',
  'Knitting',
  'Sewing',
  'Woodworking',
  'DIY',
  'Cars',
  'Motorcycles',
  'Aviation',
  'Trains',
  'Architecture',
  'Interior design',
  'Minimalism',
  'Coffee',
  'Tea',
  'Wine',
  'Craft beer',
  'Vegan food',
  'Street food',
  'Sushi',
  'Ramen',
  'Meal prep',
  'Nutrition',
  'Meditation',
  'Journaling',
  'Productivity',
  'Startups',
  'Marketing',
  'Finance',
  'Investing',
  'Crypto',
  'Real estate',
  'Law',
  'Medicine',
  'Nursing',
  'Teaching',
  'Parenting',
  'Pets',
  'Dogs',
  'Cats',
  'Horses',
  'Birdwatching',
  'Nature',
  'Environment',
  'Sustainability',
  'Volunteering',
  'Languages',
  'Grammar',
  'Pronunciation',
  'Slang',
  'Idioms',
  'Exam prep',
  'JLPT',
  'TOPIK',
  'IELTS',
  'TOEFL',
  'DELE',
  'HSK',
  'Study abroad',
  'Working holiday',
  'Expat life',
  'Remote work',
  'Digital nomad',
  'Backpacking',
  'Road trips',
  'Museums',
  'Street art',
  'Festivals',
  'Concerts',
  'Nightlife',
  'Esports',
  'RPGs',
  'Indie games',
  'Retro games',
  'Game dev',
  'Tabletop RPGs',
  'Puzzles',
  'Trivia',
  'Mythology',
  'Folklore',
  'Religion',
  'Sci-fi',
  'Fantasy',
  'Horror',
  'Mystery novels',
  'Romance novels',
  'Comics',
  'Webtoons',
  'Light novels',
  'Visual novels',
  'Cosplay',
  'Vtubers',
  'Streaming',
  'YouTube',
  'Vlogging',
  'Blogging',
  'Social media',
  'Tech news',
  'AI',
  'Robotics',
  'Cybersecurity',
  'Open source',
  'Web design',
  'Data science',
  'Linux',
  'Hardware',
  'Film cameras',
  'Vinyl records',
  'Collecting',
  'Sneakers',
  'Watches',
  'Tattoos',
  'Rugby',
  'Cricket',
  'Baseball',
  'Volleyball',
  'Badminton',
  'Table tennis',
  'Golf',
  'Formula 1',
  'Sailing',
  'Diving',
] as const;

const BIO_OPENINGS = [
  'Looking for a patient partner to practice everyday conversation.',
  'Studying for an exam and want regular speaking practice.',
  'Happy to help with grammar in exchange for casual chats.',
  'Preparing to move abroad and want to sound more natural.',
  'I learn best through voice calls and short daily messages.',
  'Just started learning and would love a friendly study buddy.',
  'I use this language at work and want to feel more confident.',
  'Trying to understand my favourite shows without subtitles.',
  'Heritage speaker brushing up on reading and writing.',
  'Looking for someone to exchange voice notes with every week.',
];

const BIO_DETAILS = [
  'I usually talk about food, films and weekend plans.',
  'Corrections are welcome, I will return the favour.',
  'I can also share tips for learning vocabulary quickly.',
  'Mornings work best for me, but I am flexible.',
  'Let us swap book and music recommendations.',
  'I am a bit shy at first but I warm up quickly.',
  'I prefer text chats during the week and calls on weekends.',
  'Ask me anything about my city, I love giving tips.',
  '',
];

const BIO_CLOSERS = [
  'See you in chat!',
  'Say hi any time.',
  'No pressure, any level is welcome.',
  '',
  '',
];

const WINDOWS: [string, string][] = [
  ['18:00', '22:00'],
  ['06:00', '09:00'],
  ['12:00', '14:00'],
  ['20:00', '23:30'],
  ['22:00', '02:00'],
  ['09:00', '17:00'],
  ['07:30', '08:30'],
  ['15:00', '18:00'],
];

const DAYS: AvailabilityPattern['days'][] = [
  'any',
  'weekdays',
  'weekdays',
  'weekends',
];

const PALETTE = [
  '#5964f2',
  '#7883f5',
  '#f9a8cf',
  '#c45b95',
  '#f0b133',
  '#46525f',
  '#1fb58f',
  '#e0604c',
  '#3b82f6',
  '#a855f7',
  '#14b8a6',
  '#f97316',
];

const hash = (index: number, salt: number) => {
  let value = Math.imul(index ^ 0x5bd1e995, 0x27d4eb2d) + salt * 0x9e3779b9;
  value = Math.imul(value ^ (value >>> 15), 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35);
  return (value ^ (value >>> 16)) >>> 0;
};

const pick = <T>(list: readonly T[], index: number, salt: number) =>
  list[hash(index, salt) % list.length];

const percent = (index: number, salt: number, share: number) =>
  hash(index, salt) % 100 < share;

const weighted = <T>(items: readonly T[], weight: (rank: number) => number) => {
  let total = 0;
  const cumulative = items.map((_, rank) => {
    total += weight(rank);
    return total;
  });
  return { items, cumulative, total };
};

const draw = <T>(
  { items, cumulative, total }: ReturnType<typeof weighted<T>>,
  index: number,
  salt: number,
) => {
  const target = (hash(index, salt) / 2 ** 32) * total;
  let low = 0;
  let high = cumulative.length - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (cumulative[middle] > target) high = middle;
    else low = middle + 1;
  }
  return items[low];
};

const LANGUAGE_CODES = languages.map(({ code }) => code);

const LANGUAGE_WEIGHTS = weighted(
  LANGUAGE_CODES,
  (rank) =>
    COMMON_LANGUAGES[LANGUAGE_CODES[rank]] ?? 0.2 + (hash(rank, 7) % 100) / 100,
);

const TAG_WEIGHTS = weighted(SEED_TAGS, (rank) => 1 / Math.sqrt(rank + 1));

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, offset) => from + offset);

const targetCounts = (premium: boolean) =>
  weighted(
    range(1, entitlementLimit('profile.targetLanguages', premium)),
    (rank) => (rank < 3 ? 20 : 20 * 0.7 ** (rank - 2)),
  );

const tagCounts = (premium: boolean) =>
  weighted(range(0, entitlementLimit('profile.tags', premium)), (rank) =>
    rank === 0 ? 8 : rank < 5 ? 18 : 18 * 0.7 ** (rank - 4),
  );

const TARGET_COUNTS = {
  free: targetCounts(false),
  premium: targetCounts(true),
};
const TAG_COUNTS = { free: tagCounts(false), premium: tagCounts(true) };

const covered = <T>(
  list: readonly T[],
  index: number,
  stride: number,
  offset: number,
) => {
  const slot = Math.floor(index / stride);
  return index % stride === offset && slot < list.length
    ? list[slot]
    : undefined;
};

export const seedDiscordId = (index: number) =>
  `${SEED_ID_PREFIX}${String(index).padStart(6, '0')}`;

export const seedIndex = (discordUserId: string) =>
  Number(discordUserId.slice(SEED_ID_PREFIX.length));

const languagePair = (index: number) => {
  const primaryCover = covered(LANGUAGE_CODES, index, LANGUAGE_STRIDE, 25);
  let primary = primaryCover ?? draw(LANGUAGE_WEIGHTS, index, 1);
  let first =
    covered(LANGUAGE_CODES, index, LANGUAGE_STRIDE, 26) ??
    draw(LANGUAGE_WEIGHTS, index, 2);
  for (let salt = 3; primary === first; salt += 1) {
    if (primaryCover) first = draw(LANGUAGE_WEIGHTS, index, salt);
    else primary = draw(LANGUAGE_WEIGHTS, index, salt);
  }
  return { primary, first };
};

const distinct = <T>(
  count: number,
  initial: T[],
  next: (salt: number) => T,
  excluded: T[] = [],
) => {
  const chosen = [...initial];
  for (let salt = 0; chosen.length < count; salt += 1) {
    const candidate = next(salt);
    if (!chosen.includes(candidate) && !excluded.includes(candidate))
      chosen.push(candidate);
  }
  return chosen;
};

const targetsFor = (
  index: number,
  primary: string,
  first: string,
  premium: boolean,
) => {
  const count = draw(TARGET_COUNTS[premium ? 'premium' : 'free'], index, 3);
  return distinct(
    count,
    [first],
    (salt) => draw(LANGUAGE_WEIGHTS, index, 200 + salt),
    [primary],
  ).map((language, position) => ({
    language,
    proficiencyLevel: pick(LEVELS, index, 10 + position),
    position,
  }));
};

const tagsFor = (index: number, premium: boolean) => {
  const cover = covered(SEED_TAGS, index, TAG_STRIDE, 13);
  const count = Math.max(
    cover ? 1 : 0,
    draw(TAG_COUNTS[premium ? 'premium' : 'free'], index, 40),
  );
  return distinct<string>(count, cover ? [cover] : [], (salt) =>
    draw(TAG_WEIGHTS, index, 400 + salt),
  );
};

const availabilityFor = (index: number): AvailabilityPattern | null => {
  const roll = hash(index, 20) % 20;
  if (roll < 3) return null;
  const days = pick(DAYS, index, 21);
  if (roll < 7) return { days, from: '', to: '', anyTime: true };
  const [from, to] = pick(WINDOWS, index, 22);
  return { days, from, to };
};

const cardFor = (index: number, premium: boolean) => {
  const freeColor = pick([null, ...FREE_CARD_COLORS], index, 90)?.id ?? null;
  if (!premium) return { cardColor: freeColor };
  const roll = hash(index, 91) % 100;
  const accentOverride = percent(index, 92, SEED_SHARES.premiumAccent)
    ? pick(PALETTE, index, 93)
    : null;
  if (roll < SEED_SHARES.premiumTheme)
    return {
      cardColor: pick(PREMIUM_CARD_THEMES, index, 94).id,
      accentOverride,
    };
  if (roll < SEED_SHARES.premiumTheme + SEED_SHARES.premiumGradient) {
    const [from, to] = distinct(2, [], (salt) =>
      pick(PALETTE, index, 95 + salt),
    );
    return {
      cardColor: CUSTOM_CARD_THEME_ID,
      customGradientFrom: from,
      customGradientTo: to,
      accentOverride,
    };
  }
  return { cardColor: freeColor, accentOverride };
};

export type GeneratedDummy = {
  user: NewUser;
  profile: Omit<NewProfile, 'userId'>;
  targetLanguages: {
    language: string;
    proficiencyLevel: Proficiency;
    position: number;
  }[];
  premium: boolean;
  voice: SeedVoice | null;
};

export const generateDummy = (index: number, now: Date): GeneratedDummy => {
  const partner = index % 10 === 2 ? languagePair(index - 1) : null;
  const { primary, first } = partner
    ? { primary: partner.first, first: partner.primary }
    : languagePair(index);
  const premium = percent(index, 80, SEED_SHARES.premium);
  const targetLanguages = targetsFor(index, primary, first, premium);
  const [country, zones] = pick(LOCATIONS, index, 30);
  const timezone = index % 25 === 9 ? null : pick(zones, index, 31);
  const availability = timezone ? availabilityFor(index) : null;
  const bio = [
    pick(BIO_OPENINGS, index, 50),
    pick(BIO_DETAILS, index, 51),
    pick(BIO_CLOSERS, index, 52),
  ]
    .filter(Boolean)
    .join(' ');
  const voice =
    premium && percent(index, 100, SEED_SHARES.premiumVoice)
      ? pick(SEED_VOICES, index, 101)
      : null;
  const boosted = premium && percent(index, 102, SEED_SHARES.premiumBoost);
  const bumpAge = (hash(index, 70) / 2 ** 32) ** 1.6 * 30 * DAY_MS;

  return {
    user: {
      discordUserId: seedDiscordId(index),
      discordUsername: `seed_${index}`,
      displayName: `${pick(FIRST_NAMES, index, 60)} ${pick(LAST_INITIALS, index, 61)}.`,
      isSynthetic: true,
    },
    profile: {
      isPublic: !percent(index, 62, 3),
      hiddenByModeration: percent(index, 63, 2),
      allowAnonymousCopy: !percent(index, 64, 18),
      displayTimezone: !percent(index, 65, 8),
      displayAvailability: !percent(index, 66, 10),
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
      tags: tagsFor(index, premium),
      country,
      timezone,
      lastBumpedAt: new Date(now.getTime() - Math.floor(bumpAge)),
      boostedUntil: boosted
        ? new Date(now.getTime() + (1 + (hash(index, 103) % 23)) * HOUR_MS)
        : null,
      voiceIntroSeconds: voice?.seconds ?? null,
      ...cardFor(index, premium),
    },
    targetLanguages,
    premium,
    voice,
  };
};

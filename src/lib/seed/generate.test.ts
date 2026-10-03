import { expect, test } from 'bun:test';
import { isValidCountryCode } from '@/constants/countries';
import {
  isValidIANATimezone,
  isValidLanguageCode,
  languages,
} from '@/constants/languages';
import {
  CUSTOM_CARD_THEME_ID,
  FREE_CARD_COLORS,
  isValidHex,
  PREMIUM_CARD_THEMES,
} from '@/features/Discovery/cardTheme';
import { entitlementLimit } from '@/lib/entitlements';
import { hasUniqueTags, TAG_MAX, TAG_MIN } from '@/lib/profileFields';
import {
  generateDummy,
  SEED_TAGS,
  SEED_VOICES,
  seedDiscordId,
  seedIndex,
} from './generate';

const now = new Date('2026-09-27T12:00:00Z');
const dummies = Array.from({ length: 20000 }, (_, offset) =>
  generateDummy(offset + 1, now),
);
const premium = dummies.filter((dummy) => dummy.premium);
const free = dummies.filter((dummy) => !dummy.premium);

const tally = (values: string[]) => {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
};

const share = (
  list: typeof dummies,
  predicate: (dummy: (typeof dummies)[number]) => boolean,
) => list.filter(predicate).length / list.length;

test('reproduces the same dummy for the same index', () => {
  expect(generateDummy(4321, now)).toEqual(generateDummy(4321, now));
  expect(generateDummy(4321, now)).not.toEqual(generateDummy(4322, now));
  expect(seedDiscordId(42)).toBe('seed-000042');
  expect(seedIndex(seedDiscordId(42))).toBe(42);
});

test('marks every dummy with a reserved non-Discord identity', () => {
  const ids = new Set(dummies.map(({ user }) => user.discordUserId));

  expect(ids.size).toBe(dummies.length);
  for (const { user } of dummies) {
    expect(user.isSynthetic).toBe(true);
    expect(user.discordUserId).toMatch(/^seed-\d{6}$/);
    expect(user.discordUserId.length).toBeLessThanOrEqual(32);
    expect(user.displayName).not.toMatch(/dummy|seed/i);
  }
  expect(
    new Set(dummies.map(({ user }) => user.displayName)).size,
  ).toBeGreaterThan(1000);
});

test('keeps every profile within its tier limits', () => {
  for (const dummy of dummies) {
    const { profile, targetLanguages } = dummy;
    const tags = profile.tags ?? [];
    expect(profile.bio.length).toBeGreaterThanOrEqual(10);
    expect(profile.bio.length).toBeLessThanOrEqual(500);
    expect(tags.length).toBeLessThanOrEqual(
      entitlementLimit('profile.tags', dummy.premium),
    );
    expect(hasUniqueTags(tags)).toBe(true);
    expect(isValidLanguageCode(profile.primaryLanguage)).toBe(true);
    expect(targetLanguages.length).toBeGreaterThanOrEqual(1);
    expect(targetLanguages.length).toBeLessThanOrEqual(
      entitlementLimit('profile.targetLanguages', dummy.premium),
    );
    const codes = targetLanguages.map(({ language }) => language);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).not.toContain(profile.primaryLanguage);
    expect(codes.every(isValidLanguageCode)).toBe(true);
    expect(profile.targetLanguage).toBe(codes[0]);
    for (const time of [profile.availabilityFrom, profile.availabilityTo]) {
      if (time) expect(time).toMatch(/^[0-2][0-9]:[0-5][0-9]$/);
    }
  }
});

test('covers every supported language unevenly as primary and target', () => {
  const primaries = tally(
    dummies.map(({ profile }) => profile.primaryLanguage),
  );
  const targets = tally(
    dummies.flatMap(({ targetLanguages }) =>
      targetLanguages.map(({ language }) => language),
    ),
  );

  for (const counts of [primaries, targets]) {
    expect(counts.size).toBe(languages.length);
    const sorted = [...counts.values()].sort((a, b) => b - a);
    const total = sorted.reduce((sum, count) => sum + count, 0);
    expect(sorted[0] / (sorted.at(-1) as number)).toBeGreaterThan(50);
    expect(
      sorted.slice(0, 5).reduce((sum, count) => sum + count, 0) / total,
    ).toBeGreaterThan(0.35);
  }
  expect(primaries.get('en')).toBeGreaterThan(primaries.get('ja') ?? 0);
  expect(primaries.get('ja')).toBeGreaterThan(primaries.get('de') ?? 0);
  expect(primaries.get('de')).toBeGreaterThan(primaries.get('eu') ?? 0);
});

test('draws unevenly from a pool of exactly 200 valid tags', () => {
  expect(SEED_TAGS).toHaveLength(200);
  expect(hasUniqueTags([...SEED_TAGS])).toBe(true);
  for (const tag of SEED_TAGS) {
    expect(tag.length).toBeGreaterThanOrEqual(TAG_MIN);
    expect(tag.length).toBeLessThanOrEqual(TAG_MAX);
  }
  const counts = tally(dummies.flatMap(({ profile }) => profile.tags ?? []));
  expect(counts.size).toBe(200);
  expect(
    [...counts.keys()].every((tag) => SEED_TAGS.includes(tag as never)),
  ).toBe(true);
  const sorted = [...counts.values()].sort((a, b) => b - a);
  expect(sorted[0] / (sorted.at(-1) as number)).toBeGreaterThan(5);
  expect(
    new Set(dummies.map(({ profile }) => (profile.tags ?? []).length)).size,
  ).toBe(9);
});

test('mixes free and Supporter accounts with tier-specific language counts', () => {
  expect(premium.length / dummies.length).toBeGreaterThan(0.2);
  expect(premium.length / dummies.length).toBeLessThan(0.3);
  const premiumCounts = new Set(
    premium.map(({ targetLanguages }) => targetLanguages.length),
  );
  expect(premiumCounts).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
  expect(
    new Set(free.map(({ targetLanguages }) => targetLanguages.length)),
  ).toEqual(new Set([1, 2]));
  expect(
    new Set(
      dummies.flatMap(({ targetLanguages }) =>
        targetLanguages.map(({ proficiencyLevel }) => proficiencyLevel),
      ),
    ).size,
  ).toBe(4);
});

test('gives Supporter features only to Supporter accounts in varied combinations', () => {
  const premiumThemes = PREMIUM_CARD_THEMES.map(({ id }) => id as string);
  const freeColors = [null, ...FREE_CARD_COLORS.map(({ id }) => id as string)];

  for (const { profile, voice } of free) {
    expect(freeColors).toContain(profile.cardColor ?? null);
    expect(profile.accentOverride ?? null).toBeNull();
    expect(profile.boostedUntil).toBeNull();
    expect(voice).toBeNull();
    expect(profile.voiceIntroSeconds).toBeNull();
  }
  for (const { profile, voice } of premium) {
    expect(profile.voiceIntroSeconds ?? null).toBe(voice?.seconds ?? null);
    if (profile.cardColor === CUSTOM_CARD_THEME_ID) {
      expect(isValidHex(profile.customGradientFrom as string)).toBe(true);
      expect(isValidHex(profile.customGradientTo as string)).toBe(true);
      expect(profile.customGradientFrom).not.toBe(profile.customGradientTo);
    }
    if (profile.accentOverride)
      expect(isValidHex(profile.accentOverride)).toBe(true);
    if (profile.boostedUntil) {
      const ahead = profile.boostedUntil.getTime() - now.getTime();
      expect(ahead).toBeGreaterThan(0);
      expect(ahead).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
    }
  }
  for (const [predicate, low, high] of [
    [
      ({ profile }) => premiumThemes.includes(profile.cardColor ?? ''),
      0.3,
      0.5,
    ],
    [({ profile }) => profile.cardColor === CUSTOM_CARD_THEME_ID, 0.12, 0.28],
    [({ profile }) => Boolean(profile.accentOverride), 0.15, 0.35],
    [({ profile }) => profile.boostedUntil !== null, 0.06, 0.18],
    [({ voice }) => voice !== null, 0.17, 0.33],
  ] as [(dummy: (typeof dummies)[number]) => boolean, number, number][]) {
    expect(share(premium, predicate)).toBeGreaterThan(low);
    expect(share(premium, predicate)).toBeLessThan(high);
  }
  const combinations = new Set(
    premium.map(({ profile, voice }) =>
      [
        profile.cardColor,
        Boolean(profile.accentOverride),
        profile.boostedUntil !== null,
        voice !== null,
      ].join(),
    ),
  );
  expect(combinations.size).toBeGreaterThan(20);
  expect(
    new Set(premium.flatMap(({ voice }) => (voice ? [voice.file] : []))),
  ).toEqual(new Set(SEED_VOICES.map(({ file }) => file)));
  expect(new Set(SEED_VOICES.map(({ seconds }) => seconds)).size).toBe(
    SEED_VOICES.length,
  );
});

test('pairs countries with matching timezones', () => {
  const regions: Record<string, RegExp> = {
    JP: /^Asia\/Tokyo$/,
    US: /^America\//,
    GB: /^Europe\/London$/,
    AU: /^Australia\//,
    NZ: /^Pacific\/Auckland$/,
  };

  expect(
    new Set(dummies.map(({ profile }) => profile.country)).size,
  ).toBeGreaterThan(30);
  for (const { profile } of dummies) {
    expect(isValidCountryCode(profile.country as string)).toBe(true);
    if (!profile.timezone) {
      expect(profile.availabilityDays ?? null).toBeNull();
      continue;
    }
    expect(isValidIANATimezone(profile.timezone)).toBe(true);
    expect(profile.timezone).toMatch(
      regions[profile.country as string] ?? /\//,
    );
  }
});

test('varies availability and visibility', () => {
  expect(
    share(dummies, ({ profile }) => profile.availabilityAnyTime === true),
  ).toBeGreaterThan(0.1);
  expect(
    share(dummies, ({ profile }) => Boolean(profile.availabilityFrom)),
  ).toBeGreaterThan(0.4);
  expect(
    share(dummies, ({ profile }) => profile.availabilityDays === null),
  ).toBeGreaterThan(0.1);
  expect(
    share(
      dummies,
      ({ profile }) => !profile.isPublic || profile.hiddenByModeration === true,
    ),
  ).toBeCloseTo(0.05, 1);
  for (const flag of [
    'allowAnonymousCopy',
    'displayTimezone',
    'displayAvailability',
  ] as const) {
    const on = share(dummies, ({ profile }) => profile[flag] === true);
    expect(on).toBeGreaterThan(0.7);
    expect(on).toBeLessThan(0.97);
  }
});

test('creates mutual language-learning pairs', () => {
  for (let index = 1; index < 1000; index += 10) {
    const learner = generateDummy(index, now);
    const partner = generateDummy(index + 1, now);

    expect(partner.profile.primaryLanguage).toBe(
      learner.targetLanguages[0].language,
    );
    expect(partner.targetLanguages[0].language).toBe(
      learner.profile.primaryLanguage,
    );
  }
});

test('spreads bumps over the previous 30 days, weighted toward recent', () => {
  const ages = dummies.map(
    ({ profile }) => now.getTime() - (profile.lastBumpedAt as Date).getTime(),
  );
  const day = 24 * 60 * 60 * 1000;

  expect(Math.min(...ages)).toBeGreaterThanOrEqual(0);
  expect(Math.max(...ages)).toBeLessThanOrEqual(30 * day);
  expect(Math.max(...ages)).toBeGreaterThan(20 * day);
  expect(ages.filter((age) => age < 7 * day).length).toBeGreaterThan(
    ages.filter((age) => age > 23 * day).length,
  );
});

import { expect, test } from 'bun:test';
import { isValidCountryCode } from '@/constants/countries';
import {
  isValidIANATimezone,
  isValidLanguageCode,
} from '@/constants/languages';
import { generateDummy, seedDiscordId, seedIndex } from './generate';

const now = new Date('2026-09-27T12:00:00Z');
const dummies = Array.from({ length: 10000 }, (_, offset) =>
  generateDummy(offset + 1, now),
);

test('reproduces the same dummy for the same index', () => {
  expect(generateDummy(4321, now)).toEqual(generateDummy(4321, now));
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
});

test('keeps profiles within schema limits', () => {
  for (const { profile, targetLanguages } of dummies) {
    expect(profile.bio.length).toBeGreaterThanOrEqual(10);
    expect(profile.bio.length).toBeLessThanOrEqual(500);
    expect(profile.tags?.length).toBeLessThanOrEqual(5);
    expect(isValidLanguageCode(profile.primaryLanguage)).toBe(true);
    expect(targetLanguages.length).toBeGreaterThanOrEqual(1);
    expect(targetLanguages.length).toBeLessThanOrEqual(3);
    const languages = targetLanguages.map(({ language }) => language);
    expect(new Set(languages).size).toBe(languages.length);
    expect(languages).not.toContain(profile.primaryLanguage);
    expect(languages.every(isValidLanguageCode)).toBe(true);
    expect(profile.targetLanguage).toBe(languages[0]);
    for (const time of [profile.availabilityFrom, profile.availabilityTo]) {
      if (time) expect(time).toMatch(/^[0-2][0-9]:[0-5][0-9]$/);
    }
  }
});

test('pairs countries with matching timezones', () => {
  const regions: Record<string, RegExp> = {
    JP: /^Asia\/Tokyo$/,
    US: /^America\//,
    GB: /^Europe\/London$/,
    AU: /^Australia\//,
  };

  for (const { profile } of dummies) {
    expect(isValidCountryCode(profile.country as string)).toBe(true);
    if (!profile.timezone) continue;
    expect(isValidIANATimezone(profile.timezone)).toBe(true);
    expect(profile.timezone).toMatch(
      regions[profile.country as string] ?? /\//,
    );
  }
});

test('varies languages, availability and visibility', () => {
  const share = (predicate: (dummy: (typeof dummies)[number]) => boolean) =>
    dummies.filter(predicate).length / dummies.length;
  const primaryShare = (code: string) =>
    share(({ profile }) => profile.primaryLanguage === code);

  expect(primaryShare('en')).toBeGreaterThan(primaryShare('ja'));
  expect(primaryShare('ja')).toBeGreaterThan(primaryShare('de'));
  expect(
    share(({ targetLanguages }) => targetLanguages.length === 3),
  ).toBeGreaterThan(0.2);
  expect(
    share(({ profile }) => profile.availabilityAnyTime === true),
  ).toBeGreaterThan(0.1);
  expect(
    share(({ profile }) => Boolean(profile.availabilityFrom)),
  ).toBeGreaterThan(0.4);
  expect(
    share(({ profile }) => profile.availabilityDays === null),
  ).toBeGreaterThan(0.1);
  expect(
    share(
      ({ profile }) => !profile.isPublic || profile.hiddenByModeration === true,
    ),
  ).toBeCloseTo(0.05, 2);
  expect(share(({ profile }) => profile.boostedUntil !== null)).toBe(0.01);
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

test('spreads bumps over the previous 30 days', () => {
  const ages = dummies.map(
    ({ profile }) => now.getTime() - (profile.lastBumpedAt as Date).getTime(),
  );

  expect(Math.min(...ages)).toBeGreaterThanOrEqual(0);
  expect(Math.max(...ages)).toBeLessThanOrEqual(30 * 24 * 60 * 60 * 1000);
  expect(Math.max(...ages)).toBeGreaterThan(20 * 24 * 60 * 60 * 1000);
});

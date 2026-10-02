import { describe, expect, it } from 'bun:test';
import { Proficiency } from '@/constants/languages';
import { buildDiscordCardData, getInitials } from './data';

const labels = {
  days: { any: 'Any day', weekdays: 'Weekdays', weekends: 'Weekends' },
  anyTime: 'Any time',
  levels: {
    [Proficiency.BEGINNER]: 'Beginner',
    [Proficiency.INTERMEDIATE]: 'Intermediate',
    [Proficiency.ADVANCED]: 'Advanced',
    [Proficiency.NATIVE_LEVEL]: 'Native-level',
  },
};

const build = (
  overrides: Partial<Parameters<typeof buildDiscordCardData>[0]> = {},
) =>
  buildDiscordCardData({
    name: 'Kenji Ito',
    handle: 'kenji',
    primaryLanguage: 'ja',
    targetLanguages: [{ language: 'en', level: 'intermediate' }],
    tags: ['Anime'],
    availability: { days: 'weekdays', from: '18:00', to: '22:00' },
    country: 'JP',
    time: '21:14',
    locale: 'en',
    labels,
    ...overrides,
  });

describe('buildDiscordCardData', () => {
  it('maps the native language to its names and greeting', () => {
    expect(build().native).toEqual({
      name: 'Japanese',
      script: '日本語',
      code: 'JA',
      greeting: 'こんにちは！',
    });
  });

  it('maps target languages with level labels and steps', () => {
    expect(build().targets).toEqual([
      {
        name: 'English',
        script: 'English',
        code: 'EN',
        greeting: 'Hello!',
        level: 'Intermediate',
        steps: 2,
      },
    ]);
  });

  it('keeps targets without a level and skips empty rows', () => {
    const { targets } = build({
      targetLanguages: [{ language: '' }, { language: 'ko' }],
    });

    expect(targets).toHaveLength(1);
    expect(targets[0]).toMatchObject({ code: 'KO', level: '', steps: 0 });
  });

  it('formats availability ranges', () => {
    expect(build().availability).toEqual({
      days: 'Weekdays',
      range: '18:00–22:00',
      rangeShort: '18–22',
      text: 'Weekdays 18:00–22:00',
      short: 'Weekdays 18–22',
    });
  });

  it('keeps minutes in the short range', () => {
    expect(
      build({ availability: { days: 'any', from: '09:30', to: '17:00' } })
        .availability?.rangeShort,
    ).toBe('09:30–17');
  });

  it('formats any-time availability', () => {
    expect(
      build({ availability: { days: 'any', from: '', to: '', anyTime: true } })
        .availability?.text,
    ).toBe('Any time');
    expect(
      build({
        availability: { days: 'weekends', from: '', to: '', anyTime: true },
      }).availability?.text,
    ).toBe('Weekends · Any time');
  });

  it('omits hidden availability, country and time', () => {
    const data = build({ availability: null, country: '', time: '' });

    expect(data.availability).toBeUndefined();
    expect(data.country).toBe('');
    expect(data.time).toBe('');
  });

  it('localizes the country name', () => {
    expect(build({ locale: 'ja' }).country).toBe('日本');
  });

  it('prefixes the handle and leaves it empty when missing', () => {
    expect(build().handle).toBe('@kenji');
    expect(build({ handle: undefined }).handle).toBe('');
  });

  it('builds initials from the first two words', () => {
    expect(getInitials('Kenji Ito')).toBe('KI');
    expect(getInitials('kenji')).toBe('K');
    expect(getInitials('  Anna  Maria  Lopez ')).toBe('AM');
    expect(getInitials('')).toBe('');
  });
});

import { describe, expect, it } from 'bun:test';
import {
  DEFAULT_DISCORD_CARD,
  DISCORD_CARDS,
  FREE_DISCORD_CARDS,
  isAllowedDiscordCard,
  isDiscordCardLayout,
  PREMIUM_DISCORD_CARDS,
  resolveDiscordCard,
} from './discordCards';

describe('discord cards', () => {
  it('lists six free and nine Supporter layouts without overlap', () => {
    expect(FREE_DISCORD_CARDS).toHaveLength(6);
    expect(PREMIUM_DISCORD_CARDS).toHaveLength(9);
    expect(new Set(DISCORD_CARDS).size).toBe(15);
  });

  it('defaults to classic', () => {
    expect(DEFAULT_DISCORD_CARD).toBe('classic');
  });

  it('rejects unknown ids', () => {
    expect(isDiscordCardLayout('metal')).toBe(true);
    expect(isDiscordCardLayout('unknown')).toBe(false);
    expect(isAllowedDiscordCard('unknown', true)).toBe(false);
  });

  it('allows Supporter layouts only for Supporter members', () => {
    for (const id of FREE_DISCORD_CARDS) {
      expect(isAllowedDiscordCard(id, false)).toBe(true);
    }
    for (const id of PREMIUM_DISCORD_CARDS) {
      expect(isAllowedDiscordCard(id, false)).toBe(false);
      expect(isAllowedDiscordCard(id, true)).toBe(true);
    }
  });

  it('resolves unset values to classic', () => {
    expect(resolveDiscordCard(null, false)).toBe('classic');
    expect(resolveDiscordCard(undefined, true)).toBe('classic');
  });

  it('keeps the stored layout while entitled', () => {
    expect(resolveDiscordCard('bleed', false)).toBe('bleed');
    expect(resolveDiscordCard('mirror', true)).toBe('mirror');
    expect(resolveDiscordCard('orbit', true)).toBe('orbit');
  });

  it('falls back to classic when Supporter lapses', () => {
    expect(resolveDiscordCard('orbit', false)).toBe('classic');
    expect(resolveDiscordCard('mirror', false)).toBe('classic');
  });
});

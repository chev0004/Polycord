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
  it('lists ten free and five premium layouts without overlap', () => {
    expect(FREE_DISCORD_CARDS).toHaveLength(10);
    expect(PREMIUM_DISCORD_CARDS).toHaveLength(5);
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

  it('allows premium layouts only for premium members', () => {
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
    expect(resolveDiscordCard('mirror', false)).toBe('mirror');
    expect(resolveDiscordCard('orbit', true)).toBe('orbit');
  });

  it('falls back to classic when premium lapses', () => {
    expect(resolveDiscordCard('orbit', false)).toBe('classic');
  });
});

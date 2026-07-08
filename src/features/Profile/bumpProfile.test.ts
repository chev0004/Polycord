import { describe, expect, it } from 'bun:test';
import {
  FREE_BUMP_COOLDOWN_MS,
  getBumpCooldown,
  PREMIUM_BUMP_COOLDOWN_MS,
} from './bumpProfile';

describe('getBumpCooldown', () => {
  const now = new Date('2026-07-08T12:00:00Z');

  it('allows an immediate bump when never bumped', () => {
    const { remainingMs, nextBumpAt } = getBumpCooldown(null, false, now);

    expect(remainingMs).toBe(0);
    expect(nextBumpAt).toEqual(now);
  });

  it('applies the free cooldown', () => {
    const lastBumpedAt = new Date(now.getTime() - 60 * 60 * 1000);
    const { remainingMs } = getBumpCooldown(lastBumpedAt, false, now);

    expect(remainingMs).toBe(FREE_BUMP_COOLDOWN_MS - 60 * 60 * 1000);
  });

  it('applies the shorter premium cooldown', () => {
    const lastBumpedAt = new Date(now.getTime() - 60 * 60 * 1000);
    const { remainingMs } = getBumpCooldown(lastBumpedAt, true, now);

    expect(remainingMs).toBe(PREMIUM_BUMP_COOLDOWN_MS - 60 * 60 * 1000);
    expect(PREMIUM_BUMP_COOLDOWN_MS).toBeLessThan(FREE_BUMP_COOLDOWN_MS);
  });

  it('never returns a negative remaining time', () => {
    const lastBumpedAt = new Date(now.getTime() - 10 * 60 * 60 * 1000);
    const { remainingMs } = getBumpCooldown(lastBumpedAt, false, now);

    expect(remainingMs).toBe(0);
  });
});

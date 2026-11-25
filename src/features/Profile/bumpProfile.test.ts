import { describe, expect, it } from 'bun:test';
import { getBumpCooldown, getBumpReadyAt } from './bumpProfile';

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

    expect(remainingMs).toBe(2 * 60 * 60 * 1000);
  });

  it('applies the shorter Supporter cooldown', () => {
    const lastBumpedAt = new Date(now.getTime() - 60 * 60 * 1000);
    const { remainingMs } = getBumpCooldown(lastBumpedAt, true, now);

    expect(remainingMs).toBe(30 * 60 * 1000);
  });

  it('never returns a negative remaining time', () => {
    const lastBumpedAt = new Date(now.getTime() - 10 * 60 * 60 * 1000);
    const { remainingMs } = getBumpCooldown(lastBumpedAt, false, now);

    expect(remainingMs).toBe(0);
  });
});

describe('getBumpReadyAt', () => {
  const now = new Date('2026-07-08T12:00:00Z');

  it('sends no ready time when never bumped', () => {
    expect(getBumpReadyAt(null, false, now)).toBeUndefined();
  });

  it('sends no ready time once the cooldown has passed', () => {
    const lastBumpedAt = new Date(now.getTime() - 3 * 60 * 60 * 1000);

    expect(getBumpReadyAt(lastBumpedAt, false, now)).toBeUndefined();
  });

  it('sends the end of an active cooldown', () => {
    const lastBumpedAt = new Date(now.getTime() - 60 * 60 * 1000);

    expect(getBumpReadyAt(lastBumpedAt, false, now)).toBe(
      '2026-07-08T14:00:00.000Z',
    );
  });
});

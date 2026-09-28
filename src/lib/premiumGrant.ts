import { z } from 'zod';

export const GRANT_UNITS = ['weeks', 'months', 'years'] as const;

export type GrantUnit = (typeof GRANT_UNITS)[number];

export const GRANT_MAX: Record<GrantUnit, number> = {
  weeks: 520,
  months: 120,
  years: 10,
};

export const isValidGrant = (amount: number, unit: GrantUnit) =>
  Number.isInteger(amount) && amount >= 1 && amount <= GRANT_MAX[unit];

export const grantExpiry = (from: Date, amount: number, unit: GrantUnit) => {
  if (unit === 'weeks') return new Date(from.getTime() + amount * 604800000);
  const until = new Date(from);
  const day = until.getUTCDate();
  until.setUTCDate(1);
  until.setUTCMonth(until.getUTCMonth() + (unit === 'years' ? 12 : 1) * amount);
  const lastDay = new Date(
    Date.UTC(until.getUTCFullYear(), until.getUTCMonth() + 1, 0),
  ).getUTCDate();
  until.setUTCDate(Math.min(day, lastDay));
  return until;
};

export const premiumGrantSchema = z
  .object({
    userId: z.uuid(),
    amount: z.number(),
    unit: z.enum(GRANT_UNITS),
  })
  .refine(({ amount, unit }) => isValidGrant(amount, unit));

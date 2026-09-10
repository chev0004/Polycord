import { entitlementLimit } from '@/lib/entitlements';

export const getBumpCooldownMs = (premium: boolean) =>
  entitlementLimit('discovery.bumpCooldownMs', premium);

export const getBumpCooldown = (
  lastBumpedAt: Date | null | undefined,
  premium: boolean,
  now = new Date(),
) => {
  const nextBumpAt = lastBumpedAt
    ? new Date(lastBumpedAt.getTime() + getBumpCooldownMs(premium))
    : now;
  const remainingMs = Math.max(0, nextBumpAt.getTime() - now.getTime());

  return { nextBumpAt, remainingMs };
};

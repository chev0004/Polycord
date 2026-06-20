export const FREE_BUMP_COOLDOWN_MS = 3 * 60 * 60 * 1000;
export const PREMIUM_BUMP_COOLDOWN_MS = 90 * 60 * 1000;

export const getBumpCooldownMs = (premium: boolean) =>
  premium ? PREMIUM_BUMP_COOLDOWN_MS : FREE_BUMP_COOLDOWN_MS;

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

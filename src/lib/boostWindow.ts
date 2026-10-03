export const BOOST_DURATION_MS = 24 * 60 * 60 * 1000;

export const monthStart = (now = new Date()) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

export const nextMonthStart = (now = new Date()) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

export const boostAllowance = ({
  total,
  remaining,
  boostedUntil,
  now,
}: {
  total: number;
  remaining: number;
  boostedUntil: number;
  now: number;
}) => {
  const live =
    boostedUntil > now &&
    boostedUntil - BOOST_DURATION_MS >= monthStart(new Date(now)).getTime()
      ? 1
      : 0;
  return {
    ready: remaining,
    live,
    used: Math.max(0, total - remaining - live),
  };
};

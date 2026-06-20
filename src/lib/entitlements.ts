import type { CurrentUser } from './auth';

export const hasPremiumEntitlement = (user: CurrentUser) =>
  (process.env.POLYCORD_PREMIUM_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .includes(user.id);

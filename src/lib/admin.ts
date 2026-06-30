import type { CurrentUser } from './auth';

export const isAdmin = (user: CurrentUser) =>
  (process.env.POLYCORD_ADMIN_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(user.id);

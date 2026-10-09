import {
  AUTH_SESSION_COOKIE,
  readSessionFromCookieValue,
} from './auth-session';
import { isOwnerDiscordId } from './ownerIds';

export const DEV_COOKIE = 'polycord_dev';

export type DevToggles = { loadTracing: boolean; discoverySkeleton: boolean };

export const serializeDevToggles = ({
  loadTracing,
  discoverySkeleton,
}: DevToggles) =>
  [loadTracing && 'trace', discoverySkeleton && 'skeleton']
    .filter(Boolean)
    .join(',');

export const hasOwnerDevToggle = async (
  cookie: (name: string) => string | undefined,
  toggle: 'trace' | 'skeleton',
) => {
  const session = cookie(AUTH_SESSION_COOKIE);
  if (!cookie(DEV_COOKIE)?.split(',').includes(toggle) || !session)
    return false;
  const user = await readSessionFromCookieValue(session);
  return user !== null && isOwnerDiscordId(user.id);
};

import 'server-only';

import { hasStaffRole } from '@/db';
import type { StaffRole } from '@/features/Admin/types';
import type { CurrentUser } from './auth';

const REAUTH_WINDOW_MS = 12 * 60 * 60 * 1000;

export const ownerDiscordIds = () =>
  (process.env.POLYCORD_ADMIN_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

export const isOwnerDiscordId = (discordId: string) =>
  ownerDiscordIds().includes(discordId);

export const isOwner = (user: CurrentUser) => isOwnerDiscordId(user.id);

export const getStaffRole = async (
  user: CurrentUser & { accountId: string },
): Promise<StaffRole | null> => {
  if (isOwner(user)) return 'owner';
  return (await hasStaffRole(user.accountId)) ? 'moderator' : null;
};

export const needsReauth = (user: { issuedAt: number }) =>
  Date.now() - user.issuedAt > REAUTH_WINDOW_MS;

export const isSameOrigin = (request: Request) => {
  const origin = request.headers.get('origin');
  return (
    origin !== null &&
    URL.canParse(origin) &&
    new URL(origin).host === request.headers.get('host')
  );
};

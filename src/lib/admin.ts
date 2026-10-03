import 'server-only';

import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { countPendingCases, hasStaffRole } from '@/db';
import type { StaffRole } from '@/features/Admin/types';
import { type CurrentUser, getCurrentUser } from './auth';

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

export const loadStaffNav = async (
  user: CurrentUser & { accountId: string },
) =>
  (await getStaffRole(user))
    ? { pendingCases: await countPendingCases() }
    : null;

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

export const authorizeOwner = async (request: Request) => {
  const currentUser = await getCurrentUser();
  const role = currentUser ? await getStaffRole(currentUser) : null;

  if (!currentUser || !role) {
    return {
      error: NextResponse.json({ error: 'Not found' }, { status: 404 }),
    };
  }
  if (!isSameOrigin(request) || role !== 'owner') {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  if (needsReauth(currentUser)) {
    return {
      error: NextResponse.json({ error: 'Reauthenticate' }, { status: 401 }),
    };
  }
  return { currentUser };
};

export const readBody = async <T>(request: Request, schema: z.ZodType<T>) => {
  try {
    const parsed = schema.safeParse(await request.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  clearNotifications,
  createNotification,
  deleteNotification,
  getPublicProfileById,
  listNotificationsForUser,
  markAllNotificationsRead,
  setNotificationRead,
} from '@/db';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { localeFromRequest } from '@/lib/analytics/locale';
import { trackEvent } from '@/lib/analytics/track.server';
import { getActiveUser } from '@/lib/auth';
import { isPremiumUser } from '@/lib/entitlements.server';
import {
  enforceRateLimit,
  rateLimitedResponse,
  requestIp,
} from '@/lib/rateLimit';

const parseBody = async (
  request: Request,
): Promise<Record<string, unknown>> => {
  try {
    const body = await request.json();
    return body && typeof body === 'object'
      ? (body as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
};

export const GET = async () => {
  const currentUser = await getActiveUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [rows, premium] = await Promise.all([
    listNotificationsForUser(currentUser.accountId),
    isPremiumUser(currentUser),
  ]);

  return NextResponse.json(
    {
      premium,
      notifications: rows
        .filter(({ notification }) => premium || notification.kind !== 'view')
        .map(({ notification: row, actorProfileId }) => ({
          id: row.id,
          kind: row.kind,
          actorName:
            premium && !row.isGuest && actorProfileId
              ? (row.actorName ?? undefined)
              : undefined,
          actorAvatarUrl:
            premium && !row.isGuest && actorProfileId
              ? (row.actorAvatarUrl ?? undefined)
              : undefined,
          actorProfileId:
            premium && !row.isGuest ? (actorProfileId ?? undefined) : undefined,
          isGuest: row.isGuest,
          read: row.read,
          createdAt: row.createdAt.toISOString(),
        })),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
};

export const POST = async (request: Request) => {
  const currentUser = await getActiveUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profileId = z.uuid().safeParse((await parseBody(request)).profileId);

  if (!profileId.success) {
    return NextResponse.json({ error: 'Invalid profileId' }, { status: 400 });
  }

  const target = await getPublicProfileById(
    profileId.data,
    currentUser.accountId,
  );

  if (!target) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  if (target.profile.userId === currentUser.accountId) {
    return NextResponse.json({ created: false });
  }

  const limit = await enforceRateLimit('copy', {
    userId: currentUser.accountId,
    ip: requestIp(request),
  });

  if (!limit.allowed) {
    return rateLimitedResponse(limit.retryAfterMs);
  }

  await trackEvent({
    name: ANALYTICS_EVENTS.profileCopyReceived,
    userId: currentUser.accountId,
    locale: localeFromRequest(request),
    metadata: { ownerUserId: target.profile.userId },
  });

  const notification = await createNotification({
    userId: target.profile.userId,
    kind: 'copy',
    actorUserId: currentUser.accountId,
    actorName: currentUser.name,
    actorAvatarUrl: currentUser.avatarUrl ?? null,
    isGuest: false,
  });

  return NextResponse.json({ created: notification !== null });
};

export const PATCH = async (request: Request) => {
  const currentUser = await getActiveUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await parseBody(request);

  if (body.all === true) {
    await markAllNotificationsRead(currentUser.accountId);
    return NextResponse.json({ ok: true });
  }

  const id = z.uuid().safeParse(body.id);

  if (!id.success || typeof body.read !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  await setNotificationRead(currentUser.accountId, id.data, body.read);

  return NextResponse.json({ ok: true });
};

export const DELETE = async (request: Request) => {
  const currentUser = await getActiveUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await parseBody(request);

  if (body.all === true) {
    await clearNotifications(currentUser.accountId);
    return NextResponse.json({ ok: true });
  }

  const id = z.uuid().safeParse(body.id);

  if (!id.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  await deleteNotification(currentUser.accountId, id.data);

  return NextResponse.json({ ok: true });
};

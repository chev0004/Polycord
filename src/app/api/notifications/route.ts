import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  acknowledgeNotice,
  clearNotifications,
  createNotification,
  deleteNotification,
  getPublicProfileById,
  listNotificationsForUser,
  markAllNotificationsRead,
  recordProfileInteraction,
  setNotificationRead,
} from '@/db';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { localeFromRequest } from '@/lib/analytics/locale';
import { trackEvent } from '@/lib/analytics/track.server';
import { getActiveUser, getCurrentUser } from '@/lib/auth';
import { isPremiumUser } from '@/lib/entitlements.server';
import { allowInteractionNotification } from '@/lib/notifications/interactionThrottle';
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
          message: row.message ?? undefined,
          warningCategory: row.warningCategory ?? undefined,
          acknowledgedAt: row.acknowledgedAt?.toISOString(),
          read: row.read,
          createdAt: row.createdAt.toISOString(),
        })),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
};

export const POST = async (request: Request) => {
  const currentUser = await getActiveUser();

  if (!currentUser && (await getCurrentUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profileId = z.uuid().safeParse((await parseBody(request)).profileId);

  if (!profileId.success) {
    return NextResponse.json({ error: 'Invalid profileId' }, { status: 400 });
  }

  const target = await getPublicProfileById(
    profileId.data,
    currentUser?.accountId,
  );

  if (!target) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  if (
    target.profile.userId === currentUser?.accountId ||
    (!currentUser && !target.profile.allowAnonymousCopy)
  ) {
    return NextResponse.json({ created: false });
  }

  const ip = requestIp(request);
  const limit = await enforceRateLimit('copy', {
    userId: currentUser?.accountId,
    ip,
  });

  if (!limit.allowed) {
    return rateLimitedResponse(limit.retryAfterMs);
  }

  if (target.user.isSynthetic) {
    return NextResponse.json({ created: false });
  }

  await recordProfileInteraction(target.profile.userId, 'copy');
  await trackEvent({
    name: ANALYTICS_EVENTS.profileCopyReceived,
    userId: currentUser?.accountId,
    locale: localeFromRequest(request),
    metadata: { ownerUserId: target.profile.userId },
  });

  if (
    !(await allowInteractionNotification({
      kind: 'copy',
      ownerUserId: target.profile.userId,
      actorUserId: currentUser?.accountId,
      ip,
    }))
  ) {
    return NextResponse.json({ created: false });
  }

  const notification = await createNotification({
    userId: target.profile.userId,
    kind: 'copy',
    actorUserId: currentUser?.accountId ?? null,
    actorName: currentUser?.name ?? null,
    actorAvatarUrl: currentUser?.avatarUrl ?? null,
    isGuest: !currentUser,
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

  if (id.success && body.acknowledge === true) {
    return (await acknowledgeNotice(currentUser.accountId, id.data))
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

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

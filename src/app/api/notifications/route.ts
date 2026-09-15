import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  clearNotifications,
  createNotification,
  deleteNotification,
  getPublicProfileById,
  getUserByDiscordId,
  listBlockedUserIds,
  listNotificationsForUser,
  markAllNotificationsRead,
  setNotificationRead,
  upsertDiscordUser,
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

  const user = await getUserByDiscordId(currentUser.id);

  if (!user) {
    return NextResponse.json(
      { notifications: [], premium: false },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const [rows, premium] = await Promise.all([
    listNotificationsForUser(user.id),
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

  const body = await parseBody(request);
  const profileId = body.profileId;

  if (!z.uuid().safeParse(profileId).success) {
    return NextResponse.json({ error: 'Invalid profileId' }, { status: 400 });
  }

  const target = await getPublicProfileById(profileId as string);

  if (!target?.profile.isPublic) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const actor = await upsertDiscordUser(currentUser);
  const [actorBlocks, ownerBlocks] = await Promise.all([
    listBlockedUserIds(actor.id),
    listBlockedUserIds(target.profile.userId),
  ]);
  if (
    actorBlocks.includes(target.profile.userId) ||
    ownerBlocks.includes(actor.id)
  ) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  if (target.profile.userId === actor.id) {
    return NextResponse.json({ created: false });
  }

  const limit = await enforceRateLimit('copy', {
    userId: actor.id,
    ip: requestIp(request),
  });

  if (!limit.allowed) {
    return rateLimitedResponse(limit.retryAfterMs);
  }

  await trackEvent({
    name: ANALYTICS_EVENTS.profileCopyReceived,
    userId: actor.id,
    locale: localeFromRequest(request),
    metadata: { ownerUserId: target.profile.userId },
  });

  const notification = await createNotification({
    userId: target.profile.userId,
    kind: 'copy',
    actorUserId: actor.id,
    actorName: actor.displayName,
    actorAvatarUrl: actor.avatarUrl,
    isGuest: false,
  });

  return NextResponse.json({ created: notification !== null });
};

export const PATCH = async (request: Request) => {
  const currentUser = await getActiveUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getUserByDiscordId(currentUser.id);

  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const body = await parseBody(request);

  if (body.all === true) {
    await markAllNotificationsRead(user.id);
    return NextResponse.json({ ok: true });
  }

  if (!z.uuid().safeParse(body.id).success || typeof body.read !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  await setNotificationRead(user.id, body.id as string, body.read);

  return NextResponse.json({ ok: true });
};

export const DELETE = async (request: Request) => {
  const currentUser = await getActiveUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getUserByDiscordId(currentUser.id);

  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const body = await parseBody(request);

  if (body.all === true) {
    await clearNotifications(user.id);
    return NextResponse.json({ ok: true });
  }

  if (!z.uuid().safeParse(body.id).success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  await deleteNotification(user.id, body.id as string);

  return NextResponse.json({ ok: true });
};

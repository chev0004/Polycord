import { NextResponse } from 'next/server';
import {
  clearNotifications,
  createNotification,
  deleteNotification,
  getProfileById,
  getUserByDiscordId,
  listNotificationsForUser,
  markAllNotificationsRead,
  setNotificationRead,
} from '@/db';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { localeFromRequest } from '@/lib/analytics/locale';
import { trackEvent } from '@/lib/analytics/track.server';
import { getActiveUser } from '@/lib/auth';
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
    return NextResponse.json({ notifications: [] });
  }

  const rows = await listNotificationsForUser(user.id);

  return NextResponse.json({
    notifications: rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      actorName: row.actorName ?? undefined,
      actorAvatarUrl: row.actorAvatarUrl ?? undefined,
      isGuest: row.isGuest,
      read: row.read,
      createdAt: row.createdAt.toISOString(),
    })),
  });
};

export const POST = async (request: Request) => {
  const currentUser = await getActiveUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await parseBody(request);
  const profileId = body.profileId;

  if (typeof profileId !== 'string' || profileId.length === 0) {
    return NextResponse.json({ error: 'Invalid profileId' }, { status: 400 });
  }

  const target = await getProfileById(profileId);

  if (!target?.profile.isPublic) {
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

  await createNotification({
    userId: target.profile.userId,
    kind: 'copy',
    actorName: currentUser.name,
    actorAvatarUrl: currentUser.avatarUrl ?? null,
    isGuest: false,
  });

  return NextResponse.json({ created: true });
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

  if (typeof body.id !== 'string' || typeof body.read !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  await setNotificationRead(user.id, body.id, body.read);

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

  if (typeof body.id !== 'string' || body.id.length === 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  await deleteNotification(user.id, body.id);

  return NextResponse.json({ ok: true });
};

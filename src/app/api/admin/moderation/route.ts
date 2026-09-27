import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createNotification,
  getReportById,
  listModerationUsers,
  logModerationAction,
  resolveReports,
  setProfileHiddenByModeration,
  setUserBanned,
  setUserSuspendedUntil,
} from '@/db';
import { MODERATION_ACTIONS } from '@/features/Admin/types';
import { isAdmin, isSameOrigin } from '@/lib/admin';
import { getCurrentUser } from '@/lib/auth';
import { toModLogEntry, toModReport, toModUser } from '@/lib/moderation';

const moderationSchema = z
  .object({
    userId: z.string().uuid().optional(),
    reportId: z.string().uuid().optional(),
    reportIds: z.array(z.string().uuid()).max(1000).default([]),
    action: z.enum(MODERATION_ACTIONS),
    days: z.number().int().min(1).max(90).optional(),
    note: z.string().max(500).optional(),
  })
  .refine((value) => value.userId || value.reportId)
  .refine((value) => value.action !== 'suspend' || value.days !== undefined);

export const POST = async (request: Request) => {
  const currentUser = await getCurrentUser();

  if (!currentUser || !isAdmin(currentUser)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const payload = moderationSchema.safeParse(body);

  if (!payload.success) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const { userId, reportId, action, days, note } = payload.data;
  const report = reportId ? await getReportById(reportId) : null;
  const targetUserId = userId ?? report?.reportedUserId;
  const [target] = targetUserId
    ? await listModerationUsers([targetUserId])
    : [];

  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (
    action !== 'dismiss' &&
    (toModUser(target).staff || target.user.id === currentUser.accountId)
  ) {
    return NextResponse.json(
      { error: 'Staff cannot be actioned' },
      { status: 403 },
    );
  }

  const reportIds = [
    ...payload.data.reportIds,
    ...(reportId ? [reportId] : []),
  ];

  if (action === 'dismiss' && !reportIds.length) {
    return NextResponse.json({ error: 'No reports' }, { status: 400 });
  }

  switch (action) {
    case 'warn':
      await createNotification({
        userId: target.user.id,
        kind: 'warning',
        isGuest: false,
      });
      break;
    case 'hide_profile':
    case 'unhide_profile':
      await setProfileHiddenByModeration(
        target.user.id,
        action === 'hide_profile',
      );
      break;
    case 'suspend':
    case 'unsuspend':
      await setUserSuspendedUntil(
        target.user.id,
        action === 'suspend' && days
          ? new Date(Date.now() + days * 24 * 60 * 60 * 1000)
          : null,
      );
      break;
    case 'ban':
    case 'unban':
      await setUserBanned(target.user.id, action === 'ban');
      break;
  }

  const resolved = await resolveReports(
    reportIds,
    target.user.id,
    action === 'dismiss' ? 'dismissed' : 'reviewed',
  );
  const entry = await logModerationAction({
    adminUserId: currentUser.accountId,
    targetUserId: target.user.id,
    reportId: reportIds[0],
    action,
    note,
    days: action === 'suspend' ? days : undefined,
  });
  const [updated] = await listModerationUsers([target.user.id]);

  return NextResponse.json({
    users: [toModUser(updated)],
    reports: resolved.map(toModReport),
    log: [toModLogEntry(entry)],
  });
};

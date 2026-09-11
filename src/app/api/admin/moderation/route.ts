import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createNotification,
  getReportById,
  logModerationAction,
  setProfileHiddenByModeration,
  setReportStatus,
  setUserBanned,
  setUserSuspendedUntil,
  upsertDiscordUser,
} from '@/db';
import { isAdmin } from '@/lib/admin';
import { getCurrentUser } from '@/lib/auth';

const moderationSchema = z.object({
  reportId: z.string().uuid(),
  action: z.enum([
    'dismiss',
    'warn',
    'hide_profile',
    'unhide_profile',
    'suspend',
    'unsuspend',
    'ban',
    'unban',
  ]),
  days: z.number().int().min(1).max(90).optional(),
  note: z.string().max(500).optional(),
});

export const POST = async (request: Request) => {
  const currentUser = await getCurrentUser();

  if (!currentUser || !isAdmin(currentUser)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
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

  const { reportId, action, days, note } = payload.data;
  const report = await getReportById(reportId);

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  const targetUserId = report.reportedUserId;

  switch (action) {
    case 'dismiss':
      await setReportStatus(reportId, 'dismissed');
      break;
    case 'warn':
      await createNotification({
        userId: targetUserId,
        kind: 'warning',
        isGuest: false,
      });
      await setReportStatus(reportId, 'reviewed');
      break;
    case 'hide_profile':
      await setProfileHiddenByModeration(targetUserId, true);
      await setReportStatus(reportId, 'reviewed');
      break;
    case 'unhide_profile':
      await setProfileHiddenByModeration(targetUserId, false);
      break;
    case 'suspend':
      await setUserSuspendedUntil(
        targetUserId,
        new Date(Date.now() + (days ?? 7) * 24 * 60 * 60 * 1000),
      );
      await setReportStatus(reportId, 'reviewed');
      break;
    case 'unsuspend':
      await setUserSuspendedUntil(targetUserId, null);
      break;
    case 'ban':
      await setUserBanned(targetUserId, true);
      await setReportStatus(reportId, 'reviewed');
      break;
    case 'unban':
      await setUserBanned(targetUserId, false);
      break;
  }

  const admin = await upsertDiscordUser(currentUser);

  await logModerationAction({
    adminUserId: admin.id,
    targetUserId,
    reportId,
    action,
    note,
  });

  return NextResponse.json({ ok: true });
};

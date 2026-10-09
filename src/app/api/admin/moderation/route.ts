import { NextResponse } from 'next/server';
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
import { scopedRoute } from '@/db/client';
import { canModerate } from '@/features/Admin/permissions';
import { OWNER_ACTIONS } from '@/features/Admin/types';
import { getStaffRole, isSameOrigin, needsReauth } from '@/lib/admin';
import { getCurrentUser } from '@/lib/auth';
import {
  staffRoleOf,
  toModLogEntry,
  toModReport,
  toModUser,
} from '@/lib/moderation';
import { moderationSchema } from '@/lib/moderationRequest';

export const POST = scopedRoute(async (request: Request) => {
  const currentUser = await getCurrentUser();
  const role = currentUser ? await getStaffRole(currentUser) : null;

  if (!currentUser || !role) {
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
    return NextResponse.json(
      {
        error:
          payload.error.issues.find((issue) => issue.path[0] === 'note')
            ?.message ?? 'Invalid action',
      },
      { status: 400 },
    );
  }

  const { userId, reportId, action, days } = payload.data;
  const category = action === 'warn' ? payload.data.category : undefined;
  const note = category ? undefined : payload.data.note;
  const ownerOnly = (OWNER_ACTIONS as readonly string[]).includes(action);

  if (ownerOnly && role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (ownerOnly && needsReauth(currentUser)) {
    return NextResponse.json({ error: 'Reauthenticate' }, { status: 401 });
  }

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
    (target.user.id === currentUser.accountId ||
      !canModerate(role, staffRoleOf(target)))
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
        message: note,
        warningCategory: category,
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
    warningCategory: category,
    days: action === 'suspend' ? days : undefined,
  });
  const [updated] = await listModerationUsers([target.user.id]);

  return NextResponse.json({
    users: [toModUser(updated)],
    reports: resolved.map(toModReport),
    log: [toModLogEntry(entry)],
  });
});

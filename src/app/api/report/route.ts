import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createReport, getPublicProfileById, type ReportReason } from '@/db';
import { getActiveUser } from '@/lib/auth';
import {
  enforceRateLimit,
  rateLimitedResponse,
  requestIp,
} from '@/lib/rateLimit';

const REPORT_REASONS: ReportReason[] = [
  'spam',
  'harassment',
  'inappropriate',
  'impersonation',
  'other',
];

const MAX_DETAILS_LENGTH = 1000;

type ReportBody = {
  profileId: string;
  reason: ReportReason;
  details?: string;
};

const readReportBody = async (request: Request): Promise<ReportBody | null> => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return null;
  }

  if (!body || typeof body !== 'object') {
    return null;
  }

  const { profileId, reason, details } = body as Record<string, unknown>;

  if (typeof profileId !== 'string' || !z.uuid().safeParse(profileId).success) {
    return null;
  }

  if (
    typeof reason !== 'string' ||
    !REPORT_REASONS.includes(reason as ReportReason)
  ) {
    return null;
  }

  if (
    details !== undefined &&
    (typeof details !== 'string' || details.length > MAX_DETAILS_LENGTH)
  ) {
    return null;
  }

  return { profileId, reason: reason as ReportReason, details };
};

export const POST = async (request: Request) => {
  const currentUser = await getActiveUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await readReportBody(request);

  if (!body) {
    return NextResponse.json({ error: 'Invalid report' }, { status: 400 });
  }

  const target = await getPublicProfileById(
    body.profileId,
    currentUser.accountId,
  );

  if (!target) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  if (target.profile.userId === currentUser.accountId) {
    return NextResponse.json(
      { error: 'Cannot report your own profile' },
      { status: 400 },
    );
  }

  const limit = await enforceRateLimit('report', {
    userId: currentUser.accountId,
    ip: requestIp(request),
  });

  if (!limit.allowed) {
    return rateLimitedResponse(limit.retryAfterMs);
  }

  await createReport({
    reporterUserId: currentUser.accountId,
    reportedUserId: target.profile.userId,
    reportedProfileId: target.profile.id,
    reason: body.reason,
    details: body.details,
  });

  return NextResponse.json({ reported: true });
};

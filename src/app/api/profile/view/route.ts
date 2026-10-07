import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPublicProfileById } from '@/db';
import { scopedRoute } from '@/db/client';
import { getCurrentUser } from '@/lib/auth';
import { receiveProfileView } from '@/lib/notifications/profileView';
import {
  enforceRateLimit,
  rateLimitedResponse,
  requestIp,
} from '@/lib/rateLimit';

export const POST = scopedRoute(async (request: Request) => {
  const body = await request.json().catch(() => null);
  const profileId = z.uuid().safeParse(body?.profileId);

  if (!profileId.success) {
    return NextResponse.json({ error: 'Invalid profileId' }, { status: 400 });
  }

  const viewer = await getCurrentUser();
  const target = await getPublicProfileById(profileId.data, viewer?.accountId);

  if (!target) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const limit = await enforceRateLimit('view', {
    userId: viewer?.accountId,
    ip: requestIp(request),
  });

  if (!limit.allowed) {
    return rateLimitedResponse(limit.retryAfterMs);
  }

  await receiveProfileView({
    ownerUserId: target.profile.userId,
    synthetic: target.user.isSynthetic,
    viewer,
  });

  return new NextResponse(null, { status: 204 });
});

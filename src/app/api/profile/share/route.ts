import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPublicProfileById } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { receiveProfileShare } from '@/lib/notifications/profileShare';
import {
  enforceRateLimit,
  rateLimitedResponse,
  requestIp,
} from '@/lib/rateLimit';

export const POST = async (request: Request) => {
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

  const limit = await enforceRateLimit('share', {
    userId: viewer?.accountId,
    ip: requestIp(request),
  });

  if (!limit.allowed) {
    return rateLimitedResponse(limit.retryAfterMs);
  }

  return NextResponse.json({
    created: await receiveProfileShare({
      ownerUserId: target.profile.userId,
      synthetic: target.user.isSynthetic,
      viewer,
    }),
  });
};

import { NextResponse } from 'next/server';
import { bumpProfileForUser, getProfileByUserId } from '@/db';
import { getBumpCooldown } from '@/features/Profile/bumpProfile';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { localeFromRequest } from '@/lib/analytics/locale';
import { trackEvent } from '@/lib/analytics/track.server';
import { getActiveUser } from '@/lib/auth';
import { isPremiumUser } from '@/lib/entitlements.server';
import { enforceRateLimit, requestIp } from '@/lib/rateLimit';

export const POST = async (request: Request) => {
  const currentUser = await getActiveUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = await enforceRateLimit('bump', {
    userId: currentUser.accountId,
    ip: requestIp(request),
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests', remainingMs: limit.retryAfterMs },
      { status: 429 },
    );
  }

  const row = await getProfileByUserId(currentUser.accountId);

  if (!row?.profile.isPublic) {
    return NextResponse.json(
      { error: 'Public profile required' },
      { status: 404 },
    );
  }

  const premium = await isPremiumUser(currentUser);
  const { nextBumpAt, remainingMs } = getBumpCooldown(
    row.profile.lastBumpedAt,
    premium,
  );

  if (remainingMs > 0) {
    return NextResponse.json(
      {
        error: 'Cooldown active',
        nextBumpAt: nextBumpAt.toISOString(),
        remainingMs,
      },
      { status: 429 },
    );
  }

  const bumpedAt = new Date();
  await bumpProfileForUser(currentUser.accountId, bumpedAt);

  await trackEvent({
    name: ANALYTICS_EVENTS.profileBump,
    userId: currentUser.accountId,
    locale: localeFromRequest(request),
    metadata: { premium },
  });

  return NextResponse.json({
    lastBumpedAt: bumpedAt.toISOString(),
    nextBumpAt: getBumpCooldown(
      bumpedAt,
      premium,
      bumpedAt,
    ).nextBumpAt.toISOString(),
    premium,
  });
};

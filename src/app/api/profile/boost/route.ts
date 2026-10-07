import { NextResponse } from 'next/server';
import { boostProfileForUser, getBoostStatusForUser } from '@/db';
import { scopedRoute } from '@/db/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { localeFromRequest } from '@/lib/analytics/locale';
import { trackEvent } from '@/lib/analytics/track.server';
import { getActiveUser } from '@/lib/auth';
import { isPremiumUser } from '@/lib/entitlements.server';

export const GET = scopedRoute(async () => {
  const currentUser = await getActiveUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const premium = await isPremiumUser(currentUser);

  if (!premium) {
    return NextResponse.json({ error: 'Supporter required' }, { status: 403 });
  }

  const status = await getBoostStatusForUser(currentUser.accountId, premium);

  return NextResponse.json(
    {
      boostedUntil: status.boostedUntil?.toISOString() ?? null,
      remaining: status.remaining,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
});

export const POST = scopedRoute(async (request: Request) => {
  const currentUser = await getActiveUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const premium = await isPremiumUser(currentUser);

  if (!premium) {
    return NextResponse.json({ error: 'Supporter required' }, { status: 403 });
  }

  const result = await boostProfileForUser(currentUser.accountId);
  if ('error' in result) {
    return NextResponse.json(
      {
        error: result.error,
        remaining: result.remaining,
        boostedUntil: result.boostedUntil?.toISOString(),
      },
      { status: result.status },
    );
  }
  await trackEvent({
    name: ANALYTICS_EVENTS.profileBoost,
    userId: currentUser.accountId,
    locale: localeFromRequest(request),
    metadata: { remaining: result.remaining },
  });

  return NextResponse.json({
    boostedUntil: result.boostedUntil.toISOString(),
    remaining: result.remaining,
  });
});

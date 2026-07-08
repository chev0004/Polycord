import { NextResponse } from 'next/server';
import {
  boostProfileForUser,
  getBoostStatusForUser,
  getProfileByUserId,
  upsertDiscordUser,
} from '@/db';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { localeFromRequest } from '@/lib/analytics/locale';
import { trackEvent } from '@/lib/analytics/track.server';
import { getCurrentUser } from '@/lib/auth';
import { isPremiumUser } from '@/lib/entitlements.server';

export const POST = async (request: Request) => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const premium = await isPremiumUser(currentUser);

  if (!premium) {
    return NextResponse.json({ error: 'Premium required' }, { status: 403 });
  }

  const user = await upsertDiscordUser(currentUser);
  const row = await getProfileByUserId(user.id);

  if (!row?.profile.isPublic) {
    return NextResponse.json(
      { error: 'Public profile required' },
      { status: 404 },
    );
  }

  const status = await getBoostStatusForUser(user.id, premium);

  if (status.boostedUntil) {
    return NextResponse.json(
      {
        error: 'Boost already active',
        boostedUntil: status.boostedUntil.toISOString(),
        remaining: status.remaining,
      },
      { status: 409 },
    );
  }

  if (status.remaining <= 0) {
    return NextResponse.json(
      { error: 'No boosts remaining', remaining: 0 },
      { status: 429 },
    );
  }

  const boostedUntil = await boostProfileForUser(user.id);

  if (!boostedUntil) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  await trackEvent({
    name: ANALYTICS_EVENTS.profileBoost,
    userId: user.id,
    locale: localeFromRequest(request),
    metadata: { remaining: status.remaining - 1 },
  });

  return NextResponse.json({
    boostedUntil: boostedUntil.toISOString(),
    remaining: status.remaining - 1,
  });
};

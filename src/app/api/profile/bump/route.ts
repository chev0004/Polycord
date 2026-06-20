import { NextResponse } from 'next/server';
import {
  bumpProfileForUser,
  getProfileByUserId,
  upsertDiscordUser,
} from '@/db';
import { getBumpCooldown } from '@/features/Profile/bumpProfile';
import { getCurrentUser } from '@/lib/auth';
import { hasPremiumEntitlement } from '@/lib/entitlements';

export const POST = async () => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await upsertDiscordUser(currentUser);
  const row = await getProfileByUserId(user.id);

  if (!row?.profile.isPublic) {
    return NextResponse.json(
      { error: 'Public profile required' },
      { status: 404 },
    );
  }

  const premium = hasPremiumEntitlement(currentUser);
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
  await bumpProfileForUser(user.id, bumpedAt);

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

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  extendPremiumGrant,
  listModerationUsers,
  logModerationAction,
  type ModerationAction,
  revokePremiumGrant,
} from '@/db';
import { scopedRoute } from '@/db/client';
import { authorizeOwner, readBody } from '@/lib/admin';
import { toModLogEntry, toModUser } from '@/lib/moderation';
import { premiumGrantSchema } from '@/lib/premiumGrant';

const revokeSchema = z.object({ userId: z.uuid() });

const respond = async (targetUserId: string, entry: ModerationAction) => {
  const [target] = await listModerationUsers([targetUserId]);
  return NextResponse.json({
    users: [toModUser(target)],
    reports: [],
    log: [toModLogEntry(entry)],
  });
};

export const POST = scopedRoute(async (request: Request) => {
  const { currentUser, error } = await authorizeOwner(request);
  if (error) return error;

  const body = await readBody(request, premiumGrantSchema);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const expiresAt = await extendPremiumGrant(
    body.userId,
    body.amount,
    body.unit,
    currentUser.accountId,
  );
  if (!expiresAt) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return respond(
    body.userId,
    await logModerationAction({
      adminUserId: currentUser.accountId,
      targetUserId: body.userId,
      action: 'premium_grant',
      grant: { amount: body.amount, unit: body.unit },
      expiresAt,
    }),
  );
});

export const DELETE = scopedRoute(async (request: Request) => {
  const { currentUser, error } = await authorizeOwner(request);
  if (error) return error;

  const body = await readBody(request, revokeSchema);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const revokedUntil = await revokePremiumGrant(body.userId);
  if (!revokedUntil) {
    return NextResponse.json({ error: 'No active grant' }, { status: 404 });
  }

  return respond(
    body.userId,
    await logModerationAction({
      adminUserId: currentUser.accountId,
      targetUserId: body.userId,
      action: 'premium_revoke',
      expiresAt: revokedUntil,
    }),
  );
});

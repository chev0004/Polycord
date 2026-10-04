import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  listModerationUsers,
  logModerationAction,
  type ModerationAction,
  revokePremiumGrant,
  setPremiumGrant,
} from '@/db';
import { authorizeOwner, readBody } from '@/lib/admin';
import { toModLogEntry, toModUser } from '@/lib/moderation';
import { grantExpiry, premiumGrantSchema } from '@/lib/premiumGrant';

const revokeSchema = z.object({ userId: z.uuid() });

const respond = async (targetUserId: string, entry: ModerationAction) => {
  const [target] = await listModerationUsers([targetUserId]);
  return NextResponse.json({
    users: [toModUser(target)],
    reports: [],
    log: [toModLogEntry(entry)],
  });
};

export const POST = async (request: Request) => {
  const { currentUser, error } = await authorizeOwner(request);
  if (error) return error;

  const body = await readBody(request, premiumGrantSchema);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const [target] = await listModerationUsers([body.userId]);
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const now = new Date();
  const current = target.user.premiumGrantedUntil;
  const expiresAt = grantExpiry(
    current && current > now ? current : now,
    body.amount,
    body.unit,
  );
  await setPremiumGrant(body.userId, expiresAt, currentUser.accountId);

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
};

export const DELETE = async (request: Request) => {
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
};

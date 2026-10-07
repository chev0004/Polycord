import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  addIpBan,
  getUserByDiscordId,
  type IpBan,
  listActiveIpBans,
  listIpObservations,
  listModerationUsers,
  logModerationAction,
  revokeIpBan,
} from '@/db';
import { scopedRoute } from '@/db/client';
import { authorizeOwner, getStaffRole } from '@/lib/admin';
import { getCurrentUser } from '@/lib/auth';
import { clientIp, normalizeIp } from '@/lib/clientIp';
import { toModLogEntry } from '@/lib/moderation';

const blockSchema = z.object({
  ips: z.array(z.string()).min(1).max(10),
  userId: z.string().uuid().optional(),
  reason: z.string().trim().max(500).optional(),
});

const revokeSchema = z.object({ id: z.string().uuid() });

const toView = (ban: IpBan) => ({
  id: ban.id,
  ip: ban.ip,
  reason: ban.reason ?? undefined,
  targetDiscordUserId: ban.targetDiscordUserId ?? undefined,
  createdAt: ban.createdAt.toISOString(),
});

const targetOf = async (discordUserId: string | null | undefined) =>
  discordUserId
    ? ((await getUserByDiscordId(discordUserId))?.id ?? null)
    : null;

export const GET = scopedRoute(async (request: Request) => {
  const currentUser = await getCurrentUser();

  if (!currentUser || (await getStaffRole(currentUser)) !== 'owner') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const userId = new URL(request.url).searchParams.get('userId');
  const [target] = userId ? await listModerationUsers([userId]) : [];
  const observed = target
    ? await listIpObservations(target.user.discordUserId)
    : [];

  return NextResponse.json({
    bans: (await listActiveIpBans()).map(toView),
    observed: observed.map(({ ip, lastSeenAt }) => ({
      ip,
      lastSeenAt: lastSeenAt.toISOString(),
    })),
  });
});

export const POST = scopedRoute(async (request: Request) => {
  const { currentUser, error } = await authorizeOwner(request);
  if (error) return error;

  const parsed = blockSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const ips = parsed.data.ips.map(normalizeIp);
  if (ips.some((ip) => ip === null)) {
    return NextResponse.json({ error: 'Invalid IP address' }, { status: 400 });
  }

  if (ips.includes(clientIp(request.headers))) {
    return NextResponse.json({ error: 'Own IP address' }, { status: 409 });
  }

  const [target] = parsed.data.userId
    ? await listModerationUsers([parsed.data.userId])
    : [];
  if (parsed.data.userId && !target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const log = [];
  for (const ip of new Set(ips as string[])) {
    await addIpBan({
      ip,
      reason: parsed.data.reason,
      targetDiscordUserId: target?.user.discordUserId,
      createdBy: currentUser.accountId,
    });
    log.push(
      toModLogEntry(
        await logModerationAction({
          adminUserId: currentUser.accountId,
          targetUserId: target?.user.id ?? null,
          action: 'ip_block',
          note: parsed.data.reason,
        }),
      ),
    );
  }

  return NextResponse.json({
    bans: (await listActiveIpBans()).map(toView),
    log,
  });
});

export const DELETE = scopedRoute(async (request: Request) => {
  const { currentUser, error } = await authorizeOwner(request);
  if (error) return error;

  const parsed = revokeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const revoked = await revokeIpBan(parsed.data.id, currentUser.accountId);
  if (!revoked) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const entry = await logModerationAction({
    adminUserId: currentUser.accountId,
    targetUserId: await targetOf(revoked.targetDiscordUserId),
    action: 'ip_unblock',
    note: revoked.reason ?? undefined,
  });

  return NextResponse.json({
    bans: (await listActiveIpBans()).map(toView),
    log: [toModLogEntry(entry)],
  });
});

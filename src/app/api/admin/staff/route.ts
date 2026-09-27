import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getUserByDiscordId,
  grantModerator,
  listModerationUsers,
  listStaffUserIds,
  logModerationAction,
  revokeModerator,
} from '@/db';
import {
  getStaffRole,
  isSameOrigin,
  needsReauth,
  ownerDiscordIds,
} from '@/lib/admin';
import { getCurrentUser } from '@/lib/auth';
import { staffRoleOf, toModLogEntry, toModUser } from '@/lib/moderation';

const grantSchema = z
  .object({
    userId: z.string().uuid().optional(),
    discordId: z.string().trim().min(1).max(32).optional(),
  })
  .refine((value) => value.userId || value.discordId);

const revokeSchema = z.object({ userId: z.string().uuid() });

const authorize = async (request: Request) => {
  const currentUser = await getCurrentUser();
  const role = currentUser ? await getStaffRole(currentUser) : null;

  if (!currentUser || !role) {
    return {
      error: NextResponse.json({ error: 'Not found' }, { status: 404 }),
    };
  }
  if (!isSameOrigin(request) || role !== 'owner') {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  if (needsReauth(currentUser)) {
    return {
      error: NextResponse.json({ error: 'Reauthenticate' }, { status: 401 }),
    };
  }
  return { currentUser };
};

const readBody = async <T>(request: Request, schema: z.ZodType<T>) => {
  try {
    const parsed = schema.safeParse(await request.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

const respond = async (
  targetUserId: string,
  entry?: Parameters<typeof toModLogEntry>[0],
) => {
  const [target] = await listModerationUsers([targetUserId]);
  return NextResponse.json({
    users: [toModUser(target)],
    reports: [],
    log: entry ? [toModLogEntry(entry)] : [],
    staff: await listStaffUserIds(ownerDiscordIds()),
  });
};

export const POST = async (request: Request) => {
  const { currentUser, error } = await authorize(request);
  if (error) return error;

  const body = await readBody(request, grantSchema);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const targetUserId =
    body.userId ?? (await getUserByDiscordId(body.discordId as string))?.id;
  const [target] = targetUserId
    ? await listModerationUsers([targetUserId])
    : [];

  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (staffRoleOf(target) === 'owner') {
    return NextResponse.json({ error: 'Already an owner' }, { status: 409 });
  }

  const granted = await grantModerator(target.user.id, currentUser.accountId);
  const entry = granted
    ? await logModerationAction({
        adminUserId: currentUser.accountId,
        targetUserId: target.user.id,
        action: 'grant',
      })
    : undefined;

  return respond(target.user.id, entry);
};

export const DELETE = async (request: Request) => {
  const { currentUser, error } = await authorize(request);
  if (error) return error;

  const body = await readBody(request, revokeSchema);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!(await revokeModerator(body.userId))) {
    return NextResponse.json({ error: 'Not a moderator' }, { status: 404 });
  }

  return respond(
    body.userId,
    await logModerationAction({
      adminUserId: currentUser.accountId,
      targetUserId: body.userId,
      action: 'revoke',
    }),
  );
};

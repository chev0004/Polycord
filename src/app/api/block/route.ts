import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  blockUser,
  getProfileById,
  getPublicProfileById,
  getUserByDiscordId,
  listBlockedUsers,
  unblockUser,
  upsertDiscordUser,
} from '@/db';
import { getActiveUser } from '@/lib/auth';

const profileBody = z.object({ profileId: z.uuid() });
const unblockBody = z.union([z.object({ userId: z.uuid() }), profileBody]);

export const GET = async () => {
  const currentUser = await getActiveUser();
  if (!currentUser)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await getUserByDiscordId(currentUser.id);
  return NextResponse.json(
    { users: user ? await listBlockedUsers(user.id) : [] },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
};

export const POST = async (request: Request) => {
  const currentUser = await getActiveUser();
  if (!currentUser)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = profileBody.safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json({ error: 'Invalid profileId' }, { status: 400 });
  const blocker = await upsertDiscordUser(currentUser);
  const target = await getPublicProfileById(body.data.profileId, blocker.id);
  if (!target)
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  if (target.profile.userId === blocker.id)
    return NextResponse.json(
      { error: 'Cannot block yourself' },
      { status: 400 },
    );
  await blockUser(blocker.id, target.profile.userId);
  revalidatePath('/[lang]', 'layout');
  return NextResponse.json({ blocked: true });
};

export const DELETE = async (request: Request) => {
  const currentUser = await getActiveUser();
  if (!currentUser)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = unblockBody.safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json({ error: 'Invalid block' }, { status: 400 });
  const blocker = await getUserByDiscordId(currentUser.id);
  const targetUserId =
    'userId' in body.data
      ? body.data.userId
      : (await getProfileById(body.data.profileId))?.profile.userId;
  if (blocker && targetUserId) {
    await unblockUser(blocker.id, targetUserId);
    revalidatePath('/[lang]', 'layout');
  }
  return NextResponse.json({ blocked: false });
};

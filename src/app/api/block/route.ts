import { NextResponse } from 'next/server';
import {
  blockUser,
  getProfileById,
  getUserByDiscordId,
  unblockUser,
  upsertDiscordUser,
} from '@/db';
import { getCurrentUser } from '@/lib/auth';

const readProfileId = async (request: Request): Promise<string | null> => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return null;
  }

  if (
    !body ||
    typeof body !== 'object' ||
    !('profileId' in body) ||
    typeof body.profileId !== 'string' ||
    body.profileId.length === 0
  ) {
    return null;
  }

  return body.profileId;
};

export const POST = async (request: Request) => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profileId = await readProfileId(request);

  if (!profileId) {
    return NextResponse.json({ error: 'Invalid profileId' }, { status: 400 });
  }

  const target = await getProfileById(profileId);

  if (!target) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const blocker = await upsertDiscordUser(currentUser);

  if (target.profile.userId === blocker.id) {
    return NextResponse.json(
      { error: 'Cannot block yourself' },
      { status: 400 },
    );
  }

  await blockUser(blocker.id, target.profile.userId);

  return NextResponse.json({ blocked: true });
};

export const DELETE = async (request: Request) => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profileId = await readProfileId(request);

  if (!profileId) {
    return NextResponse.json({ error: 'Invalid profileId' }, { status: 400 });
  }

  const target = await getProfileById(profileId);
  const blocker = await getUserByDiscordId(currentUser.id);

  if (target && blocker) {
    await unblockUser(blocker.id, target.profile.userId);
  }

  return NextResponse.json({ blocked: false });
};

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getProfileById, saveProfile, unsaveProfile } from '@/db';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { localeFromRequest } from '@/lib/analytics/locale';
import { trackEvent } from '@/lib/analytics/track.server';
import { getActiveUser } from '@/lib/auth';

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
    !z.uuid().safeParse(body.profileId).success
  ) {
    return null;
  }

  return body.profileId;
};

export const POST = async (request: Request) => {
  const currentUser = await getActiveUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profileId = await readProfileId(request);

  if (!profileId) {
    return NextResponse.json({ error: 'Invalid profileId' }, { status: 400 });
  }

  const target = await getProfileById(profileId);

  if (!target?.profile.isPublic) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  if (target.profile.userId === currentUser.accountId) {
    return NextResponse.json(
      { error: 'Cannot save your own profile' },
      { status: 400 },
    );
  }

  await saveProfile(currentUser.accountId, profileId);

  await trackEvent({
    name: ANALYTICS_EVENTS.profileSaveFavorite,
    userId: currentUser.accountId,
    locale: localeFromRequest(request),
  });

  return NextResponse.json({ saved: true });
};

export const DELETE = async (request: Request) => {
  const currentUser = await getActiveUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profileId = await readProfileId(request);

  if (!profileId) {
    return NextResponse.json({ error: 'Invalid profileId' }, { status: 400 });
  }

  await unsaveProfile(currentUser.accountId, profileId);

  return NextResponse.json({ saved: false });
};

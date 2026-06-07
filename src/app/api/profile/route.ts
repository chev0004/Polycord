import { NextResponse } from 'next/server';
import {
  deleteProfileForUser,
  getUserByDiscordId,
  type ProfileValues,
  upsertDiscordUser,
  upsertProfileForUser,
} from '@/db';
import { profileSchema } from '@/features/Profile/schema';
import { getCurrentUser } from '@/lib/auth';

export const POST = async (request: Request) => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const payload = profileSchema.safeParse(body);

  if (!payload.success) {
    return NextResponse.json(
      { error: 'Invalid profile', issues: payload.error.issues },
      { status: 400 },
    );
  }

  const user = await upsertDiscordUser(currentUser);
  const values = payload.data;
  const profile = await upsertProfileForUser(user.id, {
    allowAnonymousCopy: values.allowAnonymousCopy,
    availability: values.availability ?? 'flexible',
    bio: values.bio.trim(),
    country: values.country || null,
    displayTimezone: values.displayTimezone,
    isPublic: values.isPublic,
    primaryLanguage: values.primaryLanguage,
    proficiencyLevel:
      values.proficiencyLevel as ProfileValues['proficiencyLevel'],
    tags: values.tags ?? [],
    targetLanguage: values.targetLanguage,
    timezone: values.timezone || null,
  });

  return NextResponse.json({ profileId: profile.id });
};

export const DELETE = async () => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getUserByDiscordId(currentUser.id);

  if (!user) {
    return NextResponse.json({ deleted: false });
  }

  const deleted = await deleteProfileForUser(user.id);

  return NextResponse.json({ deleted });
};

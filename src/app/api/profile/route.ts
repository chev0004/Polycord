import { NextResponse } from 'next/server';
import {
  deleteProfileForUser,
  getUserByDiscordId,
  type ProfileTargetLanguageValue,
  upsertDiscordUser,
  upsertProfileForUser,
} from '@/db';
import { FREE_LANGUAGE_CAP, profileSchema } from '@/features/Profile/schema';
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

  const values = payload.data;

  if (values.targetLanguages.length > FREE_LANGUAGE_CAP) {
    return NextResponse.json(
      {
        error: 'Invalid profile',
        issues: [
          {
            code: 'too_big',
            maximum: FREE_LANGUAGE_CAP,
            path: ['targetLanguages'],
            message: 'maxLanguages',
          },
        ],
      },
      { status: 400 },
    );
  }

  const user = await upsertDiscordUser(currentUser);
  const profile = await upsertProfileForUser(user.id, {
    allowAnonymousCopy: values.allowAnonymousCopy,
    availability: values.availability ?? null,
    bio: values.bio.trim(),
    country: values.country || null,
    displayAvailability: values.displayAvailability,
    displayTimezone: values.displayTimezone,
    isPublic: values.isPublic,
    primaryLanguage: values.primaryLanguage,
    tags: values.tags ?? [],
    targetLanguages: values.targetLanguages.map((targetLanguage) => ({
      language: targetLanguage.language,
      level: targetLanguage.level as ProfileTargetLanguageValue['level'],
    })),
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

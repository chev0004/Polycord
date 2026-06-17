import { NextResponse } from 'next/server';
import {
  type ProfileTargetLanguageValue,
  upsertDiscordUser,
  upsertProfileForUser,
} from '@/db';
import { onboardingSchema } from '@/features/Onboarding/schema';
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

  const payload = onboardingSchema.safeParse(body);

  if (!payload.success) {
    return NextResponse.json(
      { error: 'Invalid onboarding profile', issues: payload.error.issues },
      { status: 400 },
    );
  }

  const user = await upsertDiscordUser(currentUser);
  const values = payload.data;
  const bio = values.bio.trim();

  const profile = await upsertProfileForUser(user.id, {
    allowAnonymousCopy: true,
    availability: values.availability,
    bio,
    country: values.country || null,
    displayTimezone: true,
    isPublic: true,
    primaryLanguage: values.primaryLanguage,
    tags: values.tags ?? [],
    targetLanguages: [
      {
        language: values.targetLanguage,
        level: values.proficiencyLevel as ProfileTargetLanguageValue['level'],
      },
    ],
    timezone: values.timezone,
  });

  return NextResponse.json({ profileId: profile.id });
};

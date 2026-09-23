import { NextResponse } from 'next/server';
import { availabilityPresetToPattern } from '@/constants/availability';
import {
  type ProfileTargetLanguageValue,
  upsertDiscordUser,
  upsertProfileForUser,
} from '@/db';
import { createOnboardingSchema } from '@/features/Onboarding/schema';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { localeFromRequest } from '@/lib/analytics/locale';
import { trackEvent } from '@/lib/analytics/track.server';
import { getActiveUser } from '@/lib/auth';
import { isPremiumUser } from '@/lib/entitlements.server';

export const POST = async (request: Request) => {
  const currentUser = await getActiveUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const payload = createOnboardingSchema(
    await isPremiumUser(currentUser),
  ).safeParse(body);

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
    availability:
      values.availability === 'flexible'
        ? null
        : availabilityPresetToPattern(values.availability),
    bio,
    country: values.country || null,
    displayAvailability: true,
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

  await trackEvent({
    name: ANALYTICS_EVENTS.onboardingComplete,
    userId: user.id,
    locale: localeFromRequest(request),
    metadata: {
      primaryLanguage: values.primaryLanguage,
      targetLanguage: values.targetLanguage,
      proficiencyLevel: values.proficiencyLevel,
      tagCount: (values.tags ?? []).length,
    },
  });

  return NextResponse.json({ profileId: profile.id });
};

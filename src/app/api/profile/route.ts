import { NextResponse } from 'next/server';
import {
  deleteProfileForUser,
  getUserByDiscordId,
  type ProfileTargetLanguageValue,
  upsertDiscordUser,
  upsertProfileForUser,
} from '@/db';
import { profileSchema } from '@/features/Profile/schema';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { localeFromRequest } from '@/lib/analytics/locale';
import { trackEvent } from '@/lib/analytics/track.server';
import { getCurrentUser } from '@/lib/auth';
import { entitlementLimit } from '@/lib/entitlements';
import { isPremiumUser } from '@/lib/entitlements.server';

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
  const premium = await isPremiumUser(currentUser);
  const languageCap = entitlementLimit('profile.targetLanguages', premium);
  const tagCap = entitlementLimit('profile.tags', premium);

  if (values.targetLanguages.length > languageCap) {
    return NextResponse.json(
      {
        error: 'Invalid profile',
        issues: [
          {
            code: 'too_big',
            maximum: languageCap,
            path: ['targetLanguages'],
            message: 'maxLanguages',
          },
        ],
      },
      { status: 400 },
    );
  }

  if ((values.tags ?? []).length > tagCap) {
    return NextResponse.json(
      {
        error: 'Invalid profile',
        issues: [
          {
            code: 'too_big',
            maximum: tagCap,
            path: ['tags'],
            message: 'maxTags',
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

  await trackEvent({
    name: ANALYTICS_EVENTS.profileSave,
    userId: user.id,
    locale: localeFromRequest(request),
    metadata: {
      isPublic: values.isPublic,
      targetLanguageCount: values.targetLanguages.length,
      tagCount: (values.tags ?? []).length,
    },
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

import { NextResponse } from 'next/server';
import {
  deleteProfileForUser,
  deleteVoiceIntroForUser,
  getProfileByDiscordUserId,
  getUserByDiscordId,
  type ProfileTargetLanguageValue,
  upsertDiscordUser,
  upsertProfileForUser,
} from '@/db';
import {
  CUSTOM_CARD_THEME_ID,
  FREE_CARD_COLORS,
  PREMIUM_CARD_THEMES,
} from '@/features/Discovery/cardTheme';
import { profileSchema } from '@/features/Profile/schema';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { localeFromRequest } from '@/lib/analytics/locale';
import { trackEvent } from '@/lib/analytics/track.server';
import { getActiveUser } from '@/lib/auth';
import { entitlementLimit, hasEntitlement } from '@/lib/entitlements';
import { isPremiumUser } from '@/lib/entitlements.server';

const isAllowedCardColor = (id: string, premiumThemes: boolean) =>
  FREE_CARD_COLORS.some((color) => color.id === id) ||
  (premiumThemes &&
    (id === CUSTOM_CARD_THEME_ID ||
      PREMIUM_CARD_THEMES.some((theme) => theme.id === id)));

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

  const payload = profileSchema.safeParse(body);

  if (!payload.success) {
    return NextResponse.json(
      { error: 'Invalid profile', issues: payload.error.issues },
      { status: 400 },
    );
  }

  const values = payload.data;
  const premium = await isPremiumUser(currentUser);
  const existing = await getProfileByDiscordUserId(currentUser.id);
  const languageCap = entitlementLimit('profile.targetLanguages', premium);
  const tagCap = entitlementLimit('profile.tags', premium);

  if (
    values.targetLanguages.length > languageCap &&
    JSON.stringify(values.targetLanguages) !==
      JSON.stringify(existing?.targetLanguages)
  ) {
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

  if (
    (values.tags ?? []).length > tagCap &&
    JSON.stringify(values.tags) !== JSON.stringify(existing?.profile.tags)
  ) {
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

  const premiumThemes = hasEntitlement('profile.cardThemes', premium);
  const cardColor =
    values.cardColor && isAllowedCardColor(values.cardColor, premiumThemes)
      ? values.cardColor
      : (existing?.profile.cardColor ?? null);
  const customGradient =
    premiumThemes && cardColor === CUSTOM_CARD_THEME_ID
      ? values.customGradient
      : undefined;

  const user = await upsertDiscordUser(currentUser);
  const profile = await upsertProfileForUser(user.id, {
    allowAnonymousCopy: values.allowAnonymousCopy,
    availability: values.availability ?? null,
    bio: values.bio.trim(),
    cardColor,
    customGradientFrom: premiumThemes
      ? (customGradient?.from ?? null)
      : existing?.profile.customGradientFrom,
    customGradientTo: premiumThemes
      ? (customGradient?.to ?? null)
      : existing?.profile.customGradientTo,
    accentOverride: premiumThemes
      ? (values.accentOverride ?? null)
      : existing?.profile.accentOverride,
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
  const currentUser = await getActiveUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getUserByDiscordId(currentUser.id);

  if (!user) {
    return NextResponse.json({ deleted: false });
  }

  const deleted = await deleteProfileForUser(user.id);
  await deleteVoiceIntroForUser(user.id);

  return NextResponse.json({ deleted });
};

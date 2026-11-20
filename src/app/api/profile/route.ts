import { NextResponse } from 'next/server';
import { isAllowedDiscordCard } from '@/constants/discordCards';
import {
  deleteProfileForUser,
  deleteVoiceIntroForUser,
  getProfileByDiscordUserId,
  type ProfileTargetLanguageValue,
  upsertProfileForUser,
} from '@/db';
import { scopedRoute } from '@/db/client';
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

const keepsStoredOverflow = (next: string[], stored: string[], cap: number) =>
  next.length <= cap ||
  (next.length <= stored.length &&
    next.slice(cap).every((entry) => stored.includes(entry)));

export const POST = scopedRoute(async (request: Request) => {
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
  const existingLanguages = existing?.targetLanguages ?? [];
  const existingTags = existing?.profile.tags ?? [];
  const tags = values.tags ?? [];

  if (
    !keepsStoredOverflow(
      values.targetLanguages.map(({ language }) => language),
      existingLanguages.map(({ language }) => language),
      languageCap,
    )
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

  if (!keepsStoredOverflow(tags, existingTags, tagCap)) {
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
  const storedDiscordCard = existing?.profile.discordCard ?? null;

  if (
    values.discordCard &&
    values.discordCard !== storedDiscordCard &&
    !isAllowedDiscordCard(values.discordCard, premiumThemes)
  ) {
    return NextResponse.json(
      {
        error: 'Invalid profile',
        issues: [
          {
            code: 'custom',
            path: ['discordCard'],
            message: 'discordCardPremium',
          },
        ],
      },
      { status: 400 },
    );
  }

  const cardColor =
    values.cardColor && isAllowedCardColor(values.cardColor, premiumThemes)
      ? values.cardColor
      : (existing?.profile.cardColor ?? null);
  const customGradient =
    premiumThemes && cardColor === CUSTOM_CARD_THEME_ID
      ? values.customGradient
      : undefined;

  const profile = await upsertProfileForUser(currentUser.accountId, {
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
    discordCard: values.discordCard ?? storedDiscordCard,
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
    userId: currentUser.accountId,
    locale: localeFromRequest(request),
    metadata: {
      isPublic: values.isPublic,
      targetLanguageCount: values.targetLanguages.length,
      tagCount: (values.tags ?? []).length,
    },
  });

  if (!existing) {
    await trackEvent({
      name: ANALYTICS_EVENTS.onboardingComplete,
      userId: currentUser.accountId,
      locale: localeFromRequest(request),
      metadata: {
        primaryLanguage: values.primaryLanguage,
        targetLanguageCount: values.targetLanguages.length,
        tagCount: (values.tags ?? []).length,
      },
    });
  }

  return NextResponse.json({ profileId: profile.id });
});

export const DELETE = scopedRoute(async () => {
  const currentUser = await getActiveUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const deleted = await deleteProfileForUser(currentUser.accountId);
  await deleteVoiceIntroForUser(currentUser.accountId);

  return NextResponse.json({ deleted });
});

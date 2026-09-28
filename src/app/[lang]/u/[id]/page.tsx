import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { after } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { cache } from 'react';
import { getLanguageName } from '@/constants/languages';
import {
  getProfileByUserId,
  getPublicProfileById,
  getUserSettingsByUserId,
  listSavedProfileIds,
  mapProfileToDiscoveryProfile,
  toViewerAvailabilityContext,
  type ViewerAvailabilityContext,
} from '@/db';
import {
  getFreeCardTheme,
  representativeColor,
} from '@/features/Discovery/cardTheme';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { trackEvent } from '@/lib/analytics/track.server';
import { getCurrentUser } from '@/lib/auth';
import { hasEntitlement } from '@/lib/entitlements';
import { isPremiumUser } from '@/lib/entitlements.server';
import { notifyProfileView } from '@/lib/notifications/profileView';
import { PublicProfileClient } from './PublicProfileClient';

const loadPublicProfile = cache(getPublicProfileById);

const requestOrigin = async () => {
  const requestHeaders = await headers();
  return `${requestHeaders.get('x-forwarded-proto') ?? 'https'}://${requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')}`;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}): Promise<Metadata> {
  const { lang, id } = await params;
  const user = await getCurrentUser();
  const row = await loadPublicProfile(id, user?.accountId);

  if (!row) {
    return {};
  }

  const t = await getTranslations({ locale: lang, namespace: 'PublicProfile' });
  const profile = mapProfileToDiscoveryProfile(row);
  const title = t('metaTitle', { name: profile.displayName });
  const summary = t('metaDescription', {
    name: profile.displayName,
    primary: getLanguageName(profile.primaryLanguage, lang),
    targets: new Intl.ListFormat(lang).format(
      profile.targetLanguages.map(({ language }) =>
        getLanguageName(language, lang),
      ),
    ),
  });

  const description = profile.about ?? summary;
  const url = `${await requestOrigin()}/${lang}/u/${id}`;
  const version = Math.max(
    row.profile.updatedAt.getTime(),
    row.user.updatedAt.getTime(),
  );
  const image = {
    url: `${url}/og?v=${version}`,
    width: 1200,
    height: 630,
    type: 'image/png',
    alt: t('ogImageAlt', { name: profile.displayName }),
  };

  return {
    title,
    description,
    openGraph: {
      type: 'profile',
      siteName: 'Polycord',
      url,
      title: profile.displayName,
      description,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: profile.displayName,
      description,
      images: [image],
    },
  };
}

export async function generateViewport({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}): Promise<Viewport> {
  const { id } = await params;
  const user = await getCurrentUser();
  const row = await loadPublicProfile(id, user?.accountId);

  return row
    ? {
        themeColor: representativeColor(
          mapProfileToDiscoveryProfile(row).cardTheme ?? getFreeCardTheme(0),
        ),
      }
    : {};
}

export default async function PublicProfileRoute({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const user = await getCurrentUser();
  const row = await loadPublicProfile(id, user?.accountId);

  if (!row) {
    notFound();
  }

  const profile = mapProfileToDiscoveryProfile(row, Boolean(user));

  let isLoggedIn = false;
  let savedProfileIds: string[] = [];
  let currentProfileId: string | undefined;
  let viewerContext: ViewerAvailabilityContext = {};
  let viewerUserId: string | undefined;
  let viewerActor: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null = null;

  if (user) {
    isLoggedIn = true;
    viewerUserId = user.accountId;
    viewerActor = {
      id: user.accountId,
      name: user.name,
      avatarUrl: user.avatarUrl ?? null,
    };
    const [viewerProfile, savedIds, viewerSettings, viewerPremium] =
      await Promise.all([
        getProfileByUserId(user.accountId),
        listSavedProfileIds(user.accountId),
        getUserSettingsByUserId(user.accountId),
        isPremiumUser(user),
      ]);
    currentProfileId = viewerProfile?.profile.id;
    savedProfileIds = savedIds;

    if (viewerProfile) {
      viewerContext = toViewerAvailabilityContext(viewerProfile.profile);
    }

    if (
      hasEntitlement('privacy.hiddenVisits', viewerPremium) &&
      viewerSettings?.hideProfileVisits
    ) {
      viewerActor = null;
    }
  }

  after(async () => {
    if (row.user.isSynthetic) return;
    await trackEvent({
      name: ANALYTICS_EVENTS.profileView,
      userId: viewerUserId ?? null,
      locale: lang,
      metadata: { ownerUserId: row.profile.userId },
    });

    if (viewerUserId !== row.profile.userId) {
      await notifyProfileView({
        ownerUserId: row.profile.userId,
        actor: viewerActor,
      });
    }
  });

  return (
    <PublicProfileClient
      locale={lang}
      profile={profile}
      isLoggedIn={isLoggedIn}
      isSaved={savedProfileIds.includes(profile.id)}
      currentProfileId={currentProfileId}
      viewerTimezone={viewerContext.timezone}
      viewerAvailability={viewerContext.availability}
    />
  );
}

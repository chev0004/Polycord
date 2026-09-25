import type { Metadata } from 'next';
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
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { trackEvent } from '@/lib/analytics/track.server';
import { getCurrentUser } from '@/lib/auth';
import { hasEntitlement } from '@/lib/entitlements';
import { isPremiumUser } from '@/lib/entitlements.server';
import { notifyProfileView } from '@/lib/notifications/profileView';
import { PublicProfileClient } from './PublicProfileClient';

const loadPublicProfile = cache(getPublicProfileById);

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
  const description = t('metaDescription', {
    name: profile.displayName,
    primary: getLanguageName(profile.primaryLanguage, lang),
    targets: new Intl.ListFormat(lang).format(
      profile.targetLanguages.map(({ language }) =>
        getLanguageName(language, lang),
      ),
    ),
  });

  return { title, description, openGraph: { title, description } };
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

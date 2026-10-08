import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { after } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { cache } from 'react';
import { getLanguageName } from '@/constants/languages';
import {
  getProfileByUserId,
  getPublicProfileById,
  listSavedProfileIds,
  mapProfileToDiscoveryProfile,
  toViewerAvailabilityContext,
  type ViewerAvailabilityContext,
} from '@/db';
import { withRenderPool } from '@/db/client';
import type { StaffRole } from '@/features/Admin/types';
import { getStaffRole } from '@/lib/admin';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { trackEvent } from '@/lib/analytics/track.server';
import { getCurrentUser } from '@/lib/auth';
import { receiveProfileView } from '@/lib/notifications/profileView';
import { tracePage } from '@/lib/pageLoadTrace';
import { PublicProfileClient } from './PublicProfileClient';

const loadPublicProfile = cache(getPublicProfileById);

export const generateMetadata = ({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}): Promise<Metadata> =>
  withRenderPool(async () => {
    const { lang, id } = await params;
    const user = await getCurrentUser();
    const row = await loadPublicProfile(id, user?.accountId);

    if (!row) {
      return {};
    }

    const t = await getTranslations({
      locale: lang,
      namespace: 'PublicProfile',
    });
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
  });

async function PublicProfileRoute({
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
  let staff: { meId: string; role: StaffRole } | undefined;

  if (user) {
    isLoggedIn = true;
    const [viewerProfile, savedIds, role] = await Promise.all([
      getProfileByUserId(user.accountId),
      listSavedProfileIds(user.accountId),
      getStaffRole(user),
    ]);
    if (role) staff = { meId: user.accountId, role };
    currentProfileId = viewerProfile?.profile.id;
    savedProfileIds = savedIds;

    if (viewerProfile) {
      viewerContext = toViewerAvailabilityContext(viewerProfile.profile);
    }
  }

  after(async () => {
    if (row.user.isSynthetic) return;
    await trackEvent({
      name: ANALYTICS_EVENTS.profileView,
      userId: user?.accountId ?? null,
      locale: lang,
      metadata: { ownerUserId: row.profile.userId },
    });
    await receiveProfileView({
      ownerUserId: row.profile.userId,
      synthetic: row.user.isSynthetic,
      viewer: user,
    });
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
      staff={staff}
    />
  );
}

export default tracePage('u/[member]', PublicProfileRoute);

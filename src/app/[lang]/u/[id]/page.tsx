import { notFound } from 'next/navigation';
import { after } from 'next/server';
import {
  getProfileByUserId,
  getPublicProfileById,
  getUserByDiscordId,
  getUserSettingsByUserId,
  listSavedProfileIds,
  mapProfileToDiscoveryProfile,
  toViewerAvailabilityContext,
} from '@/db';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { trackEvent } from '@/lib/analytics/track.server';
import { getCurrentUser } from '@/lib/auth';
import { hasEntitlement } from '@/lib/entitlements';
import { isPremiumUser } from '@/lib/entitlements.server';
import { notifyProfileView } from '@/lib/notifications/profileView';
import { PublicProfileClient } from './PublicProfileClient';

export default async function PublicProfileRoute({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const row = await getPublicProfileById(id);

  if (!row) {
    notFound();
  }

  const profile = mapProfileToDiscoveryProfile(row);
  const user = await getCurrentUser();

  let isLoggedIn = false;
  let savedProfileIds: string[] = [];
  let currentProfileId: string | undefined;
  let viewerTimezone: string | undefined;
  let viewerUserId: string | undefined;
  let viewerActor: { name: string; avatarUrl: string | null } | null = null;

  const persistedUser = user ? await getUserByDiscordId(user.id) : null;
  if (user && persistedUser) {
    isLoggedIn = true;
    viewerUserId = persistedUser.id;
    viewerActor = {
      name: persistedUser.displayName,
      avatarUrl: persistedUser.avatarUrl,
    };
    const [viewerProfile, savedIds, viewerSettings, viewerPremium] =
      await Promise.all([
        getProfileByUserId(persistedUser.id),
        listSavedProfileIds(persistedUser.id),
        getUserSettingsByUserId(persistedUser.id),
        isPremiumUser(user),
      ]);
    currentProfileId = viewerProfile?.profile.id;
    savedProfileIds = savedIds;

    if (viewerProfile) {
      viewerTimezone = toViewerAvailabilityContext(
        viewerProfile.profile,
      ).timezone;
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
      viewerTimezone={viewerTimezone}
      userAvatarUrl={user?.avatarUrl}
    />
  );
}

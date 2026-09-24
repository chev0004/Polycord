import { notFound } from 'next/navigation';
import { after } from 'next/server';
import {
  getProfileByUserId,
  getPublicProfileById,
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
  const user = await getCurrentUser();
  const row = await getPublicProfileById(id, user?.accountId);

  if (!row) {
    notFound();
  }

  const profile = mapProfileToDiscoveryProfile(row, Boolean(user));

  let isLoggedIn = false;
  let savedProfileIds: string[] = [];
  let currentProfileId: string | undefined;
  let viewerTimezone: string | undefined;
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

import { notFound } from 'next/navigation';
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
  const user = await getCurrentUser();
  const viewer = user ? await getUserByDiscordId(user.id) : null;
  const row = await getPublicProfileById(id, viewer?.id);

  if (!row) {
    notFound();
  }

  const profile = mapProfileToDiscoveryProfile(row, Boolean(user));

  let isLoggedIn = false;
  let savedProfileIds: string[] = [];
  let currentProfileId: string | undefined;
  let viewerTimezone: string | undefined;
  let viewerUserId: string | undefined;
  let viewerActor: { name: string; avatarUrl: string | null } | null = null;

  if (user) {
    isLoggedIn = true;
    viewerUserId = user.accountId;
    viewerActor = {
      name: user.name,
      avatarUrl: user.avatarUrl ?? null,
    };
    const viewerProfile = await getProfileByUserId(user.accountId);
    currentProfileId = viewerProfile?.profile.id;
    savedProfileIds = await listSavedProfileIds(user.accountId);

    if (viewerProfile) {
      viewerTimezone = toViewerAvailabilityContext(
        viewerProfile.profile,
      ).timezone;
    }

    const [viewerSettings, viewerPremium] = await Promise.all([
      getUserSettingsByUserId(user.accountId),
      isPremiumUser(user),
    ]);

    if (
      hasEntitlement('privacy.hiddenVisits', viewerPremium) &&
      viewerSettings?.hideProfileVisits
    ) {
      viewerActor = null;
    }
  }

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

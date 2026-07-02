import { notFound } from 'next/navigation';
import {
  getProfileByUserId,
  getPublicProfileById,
  listSavedProfileIds,
  mapProfileToDiscoveryProfile,
  toViewerAvailabilityContext,
  upsertDiscordUser,
} from '@/db';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { trackEvent } from '@/lib/analytics/track.server';
import { getCurrentUser } from '@/lib/auth';
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

  if (user) {
    isLoggedIn = true;
    const persistedUser = await upsertDiscordUser(user);
    viewerUserId = persistedUser.id;
    viewerActor = {
      name: persistedUser.displayName,
      avatarUrl: persistedUser.avatarUrl,
    };
    const viewerProfile = await getProfileByUserId(persistedUser.id);
    currentProfileId = viewerProfile?.profile.id;
    savedProfileIds = await listSavedProfileIds(persistedUser.id);

    if (viewerProfile) {
      viewerTimezone = toViewerAvailabilityContext(
        viewerProfile.profile,
      ).timezone;
    }
  }

  await trackEvent({
    name: ANALYTICS_EVENTS.profileView,
    userId: viewerUserId ?? null,
    locale: lang,
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

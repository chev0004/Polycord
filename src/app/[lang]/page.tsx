import { Suspense } from 'react';
import type { AvailabilityPattern } from '@/constants/availability';
import {
  getProfileByUserId,
  listSavedProfileIds,
  toViewerAvailabilityContext,
  upsertDiscordUser,
} from '@/db';
import { DiscoveryPage } from '@/features/Discovery/DiscoveryPage';
import { getCurrentUser } from '@/lib/auth';
import { DiscoveryFeed } from './DiscoveryFeed';

export default async function Home({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ authError?: string }>;
}) {
  const { lang } = await params;
  const { authError } = await searchParams;
  const user = await getCurrentUser();
  let needsOnboarding = false;
  let savedProfileIds: string[] = [];
  let currentProfileId: string | undefined;
  let viewerTimezone: string | undefined;
  let viewerAvailability: AvailabilityPattern | undefined;

  if (user) {
    const persistedUser = await upsertDiscordUser(user);
    const profile = await getProfileByUserId(persistedUser.id);
    needsOnboarding = !profile;
    currentProfileId = profile?.profile.id;
    savedProfileIds = await listSavedProfileIds(persistedUser.id);

    if (profile) {
      const viewer = toViewerAvailabilityContext(profile.profile);
      viewerTimezone = viewer.timezone;
      viewerAvailability = viewer.availability;
    }
  }

  const isLoggedIn = Boolean(user);

  return (
    <Suspense
      fallback={
        <DiscoveryPage
          authError={authError}
          isLoading
          isLoggedIn={isLoggedIn}
          locale={lang}
          needsOnboarding={needsOnboarding}
          currentProfileId={currentProfileId}
          viewerTimezone={viewerTimezone}
          viewerAvailability={viewerAvailability}
          userAvatarUrl={user?.avatarUrl}
        />
      }
    >
      <DiscoveryFeed
        authError={authError}
        isLoggedIn={isLoggedIn}
        locale={lang}
        needsOnboarding={needsOnboarding}
        savedProfileIds={savedProfileIds}
        currentProfileId={currentProfileId}
        viewerTimezone={viewerTimezone}
        viewerAvailability={viewerAvailability}
        userAvatarUrl={user?.avatarUrl}
      />
    </Suspense>
  );
}

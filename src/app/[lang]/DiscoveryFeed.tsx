import type { AvailabilityPattern } from '@/constants/availability';
import { listPublicProfiles } from '@/db';
import { DiscoveryPage } from '@/features/Discovery/DiscoveryPage';
import type { DiscoveryProfile } from '@/features/Discovery/ProfileCard';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { trackEvent } from '@/lib/analytics/track.server';

type DiscoveryFeedProps = {
  authError?: string;
  isLoggedIn: boolean;
  locale: string;
  needsOnboarding: boolean;
  savedProfileIds: string[];
  viewerUserId?: string;
  currentProfileId?: string;
  bumpReadyAt?: string;
  viewerTimezone?: string;
  viewerAvailability?: AvailabilityPattern;
  userAvatarUrl?: string;
};

export const DiscoveryFeed = async ({
  authError,
  isLoggedIn,
  locale,
  needsOnboarding,
  savedProfileIds,
  viewerUserId,
  currentProfileId,
  bumpReadyAt,
  viewerTimezone,
  viewerAvailability,
  userAvatarUrl,
}: DiscoveryFeedProps) => {
  let profiles: DiscoveryProfile[] = [];
  let feedError = false;

  try {
    profiles = await listPublicProfiles({ viewerUserId });
  } catch (error) {
    console.error('Failed to load public profiles:', error);
    feedError = true;
  }

  const boostedCount = profiles.filter((profile) => profile.boosted).length;

  if (boostedCount > 0) {
    await trackEvent({
      name: ANALYTICS_EVENTS.discoveryBoostImpressions,
      locale,
      metadata: { count: boostedCount },
    });
  }

  return (
    <DiscoveryPage
      authError={authError}
      feedError={feedError}
      isLoggedIn={isLoggedIn}
      locale={locale}
      needsOnboarding={needsOnboarding}
      profiles={profiles}
      savedProfileIds={savedProfileIds}
      currentProfileId={currentProfileId}
      bumpReadyAt={bumpReadyAt}
      viewerTimezone={viewerTimezone}
      viewerAvailability={viewerAvailability}
      userAvatarUrl={userAvatarUrl}
    />
  );
};

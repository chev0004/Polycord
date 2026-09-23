import { after } from 'next/server';
import type { AvailabilityPattern } from '@/constants/availability';
import { listDiscoveryPage } from '@/db/discovery';
import { DiscoveryPage } from '@/features/Discovery/DiscoveryPage';
import type { DiscoveryData } from '@/features/Discovery/discoveryData';
import type { DiscoveryUrlState } from '@/features/Discovery/discoveryUrlState';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { trackEvent } from '@/lib/analytics/track.server';

type DiscoveryFeedProps = {
  authError?: string;
  isLoggedIn: boolean;
  locale: string;
  needsOnboarding: boolean;
  viewerUserId?: string;
  state: DiscoveryUrlState;
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
  viewerUserId,
  state,
  currentProfileId,
  bumpReadyAt,
  viewerTimezone,
  viewerAvailability,
  userAvatarUrl,
}: DiscoveryFeedProps) => {
  let data: DiscoveryData = {
    profiles: [],
    total: 0,
    page: 1,
    tags: [],
    savedProfileIds: [],
  };
  let feedError = false;

  try {
    data = await listDiscoveryPage(
      state,
      locale,
      { timezone: viewerTimezone, availability: viewerAvailability },
      viewerUserId,
    );
  } catch (error) {
    console.error('Failed to load public profiles:', error);
    feedError = true;
  }

  const boostedCount = data.profiles.filter(
    (profile) => profile.boosted,
  ).length;

  if (boostedCount > 0) {
    after(() =>
      trackEvent({
        name: ANALYTICS_EVENTS.discoveryBoostImpressions,
        locale,
        metadata: { count: boostedCount },
      }),
    );
  }

  return (
    <DiscoveryPage
      authError={authError}
      feedError={feedError}
      isLoggedIn={isLoggedIn}
      locale={locale}
      needsOnboarding={needsOnboarding}
      profiles={data.profiles}
      discoveryData={data}
      currentProfileId={currentProfileId}
      bumpReadyAt={bumpReadyAt}
      viewerTimezone={viewerTimezone}
      viewerAvailability={viewerAvailability}
      userAvatarUrl={userAvatarUrl}
    />
  );
};

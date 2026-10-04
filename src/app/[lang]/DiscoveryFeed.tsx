import { after } from 'next/server';
import type { AvailabilityPattern } from '@/constants/availability';
import { listDiscoveryPage } from '@/db/discovery';
import type { StaffRole } from '@/features/Admin/types';
import { DiscoveryPage } from '@/features/Discovery/DiscoveryPage';
import type { DiscoveryData } from '@/features/Discovery/discoveryData';
import type { DiscoveryUrlState } from '@/features/Discovery/discoveryUrlState';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { trackEvent } from '@/lib/analytics/track.server';
import { withModerationStates } from '@/lib/moderation';

type DiscoveryFeedProps = {
  userId?: string;
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
  staff?: { meId: string; role: StaffRole };
};

export const DiscoveryFeed = async ({
  userId,
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
  staff,
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

  if (staff)
    data = { ...data, profiles: await withModerationStates(data.profiles) };

  const boostedCount = data.profiles.filter(
    (profile) => profile.boosted && !profile.synthetic,
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
      userId={userId}
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
      staff={staff}
    />
  );
};

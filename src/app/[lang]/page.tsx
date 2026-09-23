import { after } from 'next/server';
import type { AvailabilityPattern } from '@/constants/availability';
import {
  getProfileByUserId,
  getUserByDiscordId,
  mapProfileToDiscoveryProfile,
  toViewerAvailabilityContext,
} from '@/db';
import { parseDiscoveryState } from '@/features/Discovery/discoveryUrlState';
import { getBumpCooldown } from '@/features/Profile/bumpProfile';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { trackEvent } from '@/lib/analytics/track.server';
import { getCurrentUser } from '@/lib/auth';
import { DiscoveryFeed } from './DiscoveryFeed';

export default async function Home({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang } = await params;
  const query = await searchParams;
  const authError =
    typeof query.authError === 'string' ? query.authError : undefined;
  const discoveryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    for (const entry of Array.isArray(value) ? value : value ? [value] : [])
      discoveryParams.append(key, entry);
  }
  const user = await getCurrentUser();
  let needsOnboarding = false;
  let currentProfileId: string | undefined;
  let bumpReadyAt: string | undefined;
  let viewerTimezone: string | undefined;
  let viewerAvailability: AvailabilityPattern | undefined;
  let viewerUserId: string | undefined;

  const persistedUser = user ? await getUserByDiscordId(user.id) : null;
  if (persistedUser) {
    viewerUserId = persistedUser.id;
    const profile = await getProfileByUserId(persistedUser.id);
    needsOnboarding = !profile;
    currentProfileId = profile?.profile.id;

    if (profile) {
      const viewer = toViewerAvailabilityContext(profile.profile);
      viewerTimezone = viewer.timezone;
      viewerAvailability = viewer.availability;

      if (profile.profile.isPublic) {
        const { nextBumpAt } = getBumpCooldown(
          profile.profile.lastBumpedAt,
          Boolean(mapProfileToDiscoveryProfile(profile).premium),
        );
        bumpReadyAt = nextBumpAt.toISOString();
      }
    }
  }

  const isLoggedIn = Boolean(user);

  after(() =>
    trackEvent({
      name: ANALYTICS_EVENTS.discoveryView,
      userId: viewerUserId ?? null,
      locale: lang,
    }),
  );

  return (
    <DiscoveryFeed
      authError={authError}
      isLoggedIn={isLoggedIn}
      locale={lang}
      needsOnboarding={needsOnboarding}
      viewerUserId={viewerUserId}
      state={parseDiscoveryState(discoveryParams)}
      currentProfileId={currentProfileId}
      bumpReadyAt={bumpReadyAt}
      viewerTimezone={viewerTimezone}
      viewerAvailability={viewerAvailability}
      userAvatarUrl={user?.avatarUrl}
    />
  );
}

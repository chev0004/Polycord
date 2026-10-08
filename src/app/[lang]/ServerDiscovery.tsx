import { after } from 'next/server';
import type { ReactNode } from 'react';
import type { AvailabilityPattern } from '@/constants/availability';
import {
  getProfileByUserId,
  mapProfileToDiscoveryProfile,
  toViewerAvailabilityContext,
} from '@/db';
import { withRenderPool } from '@/db/client';
import type { StaffRole } from '@/features/Admin/types';
import { parseDiscoveryState } from '@/features/Discovery/discoveryUrlState';
import { PageLoadReady } from '@/features/Navigation/PageLoadTrace';
import { getBumpCooldown } from '@/features/Profile/bumpProfile';
import { getStaffRole } from '@/lib/admin';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { trackEvent } from '@/lib/analytics/track.server';
import { getCurrentUser } from '@/lib/auth';
import { type LoadMeasure, measureLoad } from '@/lib/loadTrace';
import { createPageLoadTrace } from '@/lib/pageLoadTrace';
import { AppFrame } from './AppFrame';
import { DiscoveryFeed } from './DiscoveryFeed';

type ServerDiscoveryProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const ServerDiscovery = (props: ServerDiscoveryProps) =>
  withRenderPool(async () => {
    const trace = await createPageLoadTrace();
    const measure = trace?.measure ?? measureLoad;
    const feed = renderDiscovery(props, measure);
    const { lang } = await props.params;
    return (
      <AppFrame params={props.params}>
        {feed}
        {trace && <TraceReady feed={feed} lang={lang} spans={trace.spans} />}
      </AppFrame>
    );
  });

const TraceReady = async ({
  feed,
  lang,
  spans,
}: {
  feed: Promise<ReactNode>;
  lang: string;
  spans: Record<string, number>;
}) => {
  await feed;
  return <PageLoadReady route={`/${lang}`} spans={spans} />;
};

async function renderDiscovery(
  { params, searchParams }: ServerDiscoveryProps,
  measure: LoadMeasure,
) {
  const { lang } = await params;
  const query = await searchParams;
  const authError =
    typeof query.authError === 'string' ? query.authError : undefined;
  const discoveryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    for (const entry of Array.isArray(value) ? value : value ? [value] : [])
      discoveryParams.append(key, entry);
  }
  const user = await measure('account', getCurrentUser);
  let needsOnboarding = false;
  let currentProfileId: string | undefined;
  let bumpReadyAt: string | undefined;
  let viewerTimezone: string | undefined;
  let viewerAvailability: AvailabilityPattern | undefined;
  let viewerUserId: string | undefined;
  let staff: { meId: string; role: StaffRole } | undefined;

  if (user) {
    viewerUserId = user.accountId;
    const [role, profile] = await Promise.all([
      measure('staff', () => getStaffRole(user)),
      measure('profile', () => getProfileByUserId(user.accountId)),
    ]);
    staff = role ? { meId: user.accountId, role } : undefined;
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

  return DiscoveryFeed({
    userId: user?.id,
    authError,
    isLoggedIn,
    locale: lang,
    needsOnboarding,
    viewerUserId,
    state: parseDiscoveryState(discoveryParams),
    currentProfileId,
    bumpReadyAt,
    viewerTimezone,
    viewerAvailability,
    userAvatarUrl: user?.avatarUrl,
    staff,
    measure,
  });
}

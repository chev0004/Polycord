import { after, NextResponse } from 'next/server';
import {
  countPendingCases,
  getProfileByUserId,
  getUserSettingsByUserId,
  mapProfileToDiscoveryProfile,
  toViewerAvailabilityContext,
} from '@/db';
import { listDiscoveryPage } from '@/db/discovery';
import { parseDiscoveryState } from '@/features/Discovery/discoveryUrlState';
import type { DiscoveryViewer } from '@/features/Discovery/discoveryViewer';
import { getBumpReadyAt } from '@/features/Profile/bumpProfile';
import { getStaffRole } from '@/lib/admin';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { trackEvent } from '@/lib/analytics/track.server';
import { gatedRoute } from '@/lib/gatedRoute';
import { withModerationStates } from '@/lib/moderation';
import { loadDiscoverySponsors } from '@/lib/sponsors';

export const GET = gatedRoute(async ({ user, measure }, request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') === 'ja' ? 'ja' : 'en';
    const state = parseDiscoveryState(searchParams);
    const profile = user
      ? await measure('profile', () => getProfileByUserId(user.accountId))
      : null;
    const availability = profile
      ? toViewerAvailabilityContext(profile.profile)
      : {};
    const [data, settings, role, sponsors] = await Promise.all([
      measure('query', () =>
        listDiscoveryPage(
          state,
          locale,
          availability,
          user?.accountId,
          searchParams.get('stack') === '1',
        ),
      ),
      user
        ? measure('settings', () => getUserSettingsByUserId(user.accountId))
        : null,
      user ? measure('staff', () => getStaffRole(user)) : null,
      measure('sponsors', () => loadDiscoverySponsors(user, locale)),
    ]);
    const [profiles, pendingCases] = await Promise.all([
      role
        ? measure('moderation', () => withModerationStates(data.profiles))
        : data.profiles,
      role ? measure('staff-count', countPendingCases) : undefined,
    ]);
    const discoveryProfile = profile
      ? mapProfileToDiscoveryProfile(profile)
      : null;
    const viewer: DiscoveryViewer = user
      ? {
          isLoggedIn: true,
          userId: user.id,
          viewerUserId: user.accountId,
          userAvatarUrl: user.avatarUrl,
          needsOnboarding: !profile,
          currentProfileId: profile?.profile.id,
          viewerTimezone: availability.timezone,
          viewerAvailability: availability.availability,
          cardTheme: discoveryProfile?.cardTheme,
          languageDisplay: settings?.languageDisplay,
          timeFormat: settings?.timeFormat,
          staff: role ? { meId: user.accountId, role } : undefined,
          skeleton: role === 'owner' ? settings?.discoverySkeleton : undefined,
          pendingCases,
          bumpReadyAt: profile?.profile.isPublic
            ? getBumpReadyAt(
                profile.profile.lastBumpedAt,
                Boolean(discoveryProfile?.premium),
              )
            : undefined,
          sponsors,
        }
      : { isLoggedIn: false, sponsors };
    const payload = { viewer, data: { ...data, profiles } };
    after(() =>
      trackEvent({
        name: ANALYTICS_EVENTS.discoveryView,
        userId: user?.accountId ?? null,
        locale,
      }),
    );
    const boosts = payload.data.profiles.filter(
      (profile) => profile.boosted && !profile.synthetic,
    ).length;
    if (boosts > 0)
      after(() =>
        trackEvent({
          name: ANALYTICS_EVENTS.discoveryBoostImpressions,
          locale,
          metadata: { count: boosts },
        }),
      );
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return NextResponse.json(
      { error: 'Temporarily unavailable' },
      {
        status: 503,
        headers: { 'Cache-Control': 'private, no-store', 'Retry-After': '5' },
      },
    );
  }
});

import { after, NextResponse } from 'next/server';
import {
  countPendingCases,
  getProfileByUserId,
  getUserSettingsByUserId,
  mapProfileToDiscoveryProfile,
  toViewerAvailabilityContext,
} from '@/db';
import type { DiscoveryViewer } from '@/features/Discovery/discoveryViewer';
import { getBumpCooldown } from '@/features/Profile/bumpProfile';
import { getStaffRole } from '@/lib/admin';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { trackEvent } from '@/lib/analytics/track.server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    const locale =
      new URL(request.url).searchParams.get('locale') === 'ja' ? 'ja' : 'en';
    let viewer: DiscoveryViewer = { isLoggedIn: false };
    if (user) {
      const [profile, settings, role] = await Promise.all([
        getProfileByUserId(user.accountId),
        getUserSettingsByUserId(user.accountId),
        getStaffRole(user),
      ]);
      const discoveryProfile = profile
        ? mapProfileToDiscoveryProfile(profile)
        : null;
      const availability = profile
        ? toViewerAvailabilityContext(profile.profile)
        : {};
      viewer = {
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
        pendingCases: role ? await countPendingCases() : undefined,
        bumpReadyAt: profile?.profile.isPublic
          ? getBumpCooldown(
              profile.profile.lastBumpedAt,
              Boolean(discoveryProfile?.premium),
            ).nextBumpAt.toISOString()
          : undefined,
      };
    }
    after(() =>
      trackEvent({
        name: ANALYTICS_EVENTS.discoveryView,
        userId: user?.accountId ?? null,
        locale,
      }),
    );
    return NextResponse.json(viewer, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return NextResponse.json(
      { error: 'Temporarily unavailable' },
      {
        status: 503,
        headers: {
          'Cache-Control': 'private, no-store',
          'Retry-After': '5',
        },
      },
    );
  }
}

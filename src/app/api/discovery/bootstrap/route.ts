import { RequestCookies } from 'next/dist/compiled/@edge-runtime/cookies';
import { after, NextResponse } from 'next/server';
import {
  countPendingCases,
  getProfileByUserId,
  getUserSettingsByUserId,
  mapProfileToDiscoveryProfile,
  toViewerAvailabilityContext,
} from '@/db';
import { withRequestPool } from '@/db/client';
import { listDiscoveryPage } from '@/db/discovery';
import { findActiveIpBan } from '@/db/ipBans';
import { parseDiscoveryState } from '@/features/Discovery/discoveryUrlState';
import type { DiscoveryViewer } from '@/features/Discovery/discoveryViewer';
import { getBumpCooldown } from '@/features/Profile/bumpProfile';
import { getStaffRole } from '@/lib/admin';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { trackEvent } from '@/lib/analytics/track.server';
import { getSessionIdentity, isBannedIdentity } from '@/lib/auth';
import { AUTH_BAN_COOKIE, readBanCookieValue } from '@/lib/auth-session';
import { clientIp } from '@/lib/clientIp';
import { createLoadTrace, measureLoad } from '@/lib/loadTrace';
import { withModerationStates } from '@/lib/moderation';

export async function GET(request: Request) {
  const trace = await createLoadTrace(request);
  const measure = trace?.measure ?? measureLoad;
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') === 'ja' ? 'ja' : 'en';
    const state = parseDiscoveryState(searchParams);
    const ip = clientIp(request.headers);
    const banCookie = new RequestCookies(request.headers).get(
      AUTH_BAN_COOKIE,
    )?.value;
    const body = await withRequestPool(async () => {
      const [banned, identity] = await Promise.all([
        measure('ban', async () => {
          const bannedId = banCookie
            ? await readBanCookieValue(banCookie)
            : null;
          const [ipBan, cookieBanned] = await Promise.all([
            ip ? findActiveIpBan(ip) : null,
            bannedId ? isBannedIdentity(bannedId) : false,
          ]);
          return Boolean(ipBan) || cookieBanned;
        }),
        measure('account', getSessionIdentity),
      ]);
      if (banned || identity?.restriction === 'banned') return null;

      const user = identity?.restriction
        ? null
        : identity?.account?.currentUser;
      const profile = user
        ? await measure('profile', () => getProfileByUserId(user.accountId))
        : null;
      const availability = profile
        ? toViewerAvailabilityContext(profile.profile)
        : {};
      const [data, settings, role] = await Promise.all([
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
            pendingCases,
            bumpReadyAt: profile?.profile.isPublic
              ? getBumpCooldown(
                  profile.profile.lastBumpedAt,
                  Boolean(discoveryProfile?.premium),
                ).nextBumpAt.toISOString()
              : undefined,
          }
        : { isLoggedIn: false };
      return { viewer, data: { ...data, profiles }, userId: user?.accountId };
    });
    if (!body)
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } },
      );
    const { userId, ...payload } = body;
    after(() =>
      trackEvent({
        name: ANALYTICS_EVENTS.discoveryView,
        userId: userId ?? null,
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
      headers: {
        'Cache-Control': 'private, no-store',
        ...trace?.headers('handler'),
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Temporarily unavailable' },
      {
        status: 503,
        headers: {
          'Cache-Control': 'private, no-store',
          'Retry-After': '5',
          ...trace?.headers('handler'),
        },
      },
    );
  }
}

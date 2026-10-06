import { after, NextResponse } from 'next/server';
import { getProfileByUserId, toViewerAvailabilityContext } from '@/db';
import { countDiscovery, listDiscoveryPage } from '@/db/discovery';
import { parseDiscoveryState } from '@/features/Discovery/discoveryUrlState';
import { getStaffRole } from '@/lib/admin';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { trackEvent } from '@/lib/analytics/track.server';
import { getCurrentUser } from '@/lib/auth';
import { withModerationStates } from '@/lib/moderation';
import { startupResponse } from '@/lib/startupProbe';

async function handleGet(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const user = await getCurrentUser();
    const profile = user ? await getProfileByUserId(user.accountId) : null;
    const state = parseDiscoveryState(searchParams);
    const locale = searchParams.get('locale') === 'ja' ? 'ja' : 'en';
    const viewer = profile ? toViewerAvailabilityContext(profile.profile) : {};
    let data =
      searchParams.get('count') === '1'
        ? {
            total: await countDiscovery(state, locale, viewer, user?.accountId),
          }
        : await listDiscoveryPage(
            state,
            locale,
            viewer,
            user?.accountId,
            searchParams.get('stack') === '1',
          );
    if ('profiles' in data && user && (await getStaffRole(user))) {
      data = { ...data, profiles: await withModerationStates(data.profiles) };
    }
    if ('profiles' in data && searchParams.get('initial') === '1') {
      const count = data.profiles.filter(
        (profile) => profile.boosted && !profile.synthetic,
      ).length;
      if (count > 0)
        after(() =>
          trackEvent({
            name: ANALYTICS_EVENTS.discoveryBoostImpressions,
            locale,
            metadata: { count },
          }),
        );
    }
    return NextResponse.json(data, {
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
}

export const GET = (request: Request) =>
  startupResponse('discovery', () => handleGet(request));

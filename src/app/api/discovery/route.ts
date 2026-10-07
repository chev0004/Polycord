import { after, NextResponse } from 'next/server';
import { getProfileByUserId, toViewerAvailabilityContext } from '@/db';
import { countDiscovery, listDiscoveryPage } from '@/db/discovery';
import { parseDiscoveryState } from '@/features/Discovery/discoveryUrlState';
import { getStaffRole } from '@/lib/admin';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { trackEvent } from '@/lib/analytics/track.server';
import { getCurrentUser } from '@/lib/auth';
import { createLoadTrace, measureLoad } from '@/lib/loadTrace';
import { withModerationStates } from '@/lib/moderation';

export async function GET(request: Request) {
  const trace = await createLoadTrace(request);
  const measure = trace?.measure ?? measureLoad;
  try {
    const { searchParams } = new URL(request.url);
    const user = await measure('account', getCurrentUser);
    const profile = user
      ? await measure('profile', () => getProfileByUserId(user.accountId))
      : null;
    const state = parseDiscoveryState(searchParams);
    const locale = searchParams.get('locale') === 'ja' ? 'ja' : 'en';
    const viewer = profile ? toViewerAvailabilityContext(profile.profile) : {};
    let data =
      searchParams.get('count') === '1'
        ? {
            total: await measure('query', () =>
              countDiscovery(state, locale, viewer, user?.accountId),
            ),
          }
        : await measure('query', () =>
            listDiscoveryPage(
              state,
              locale,
              viewer,
              user?.accountId,
              searchParams.get('stack') === '1',
            ),
          );
    if ('profiles' in data && user && (await getStaffRole(user))) {
      const profiles = data.profiles;
      data = {
        ...data,
        profiles: await measure('moderation', () =>
          withModerationStates(profiles),
        ),
      };
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

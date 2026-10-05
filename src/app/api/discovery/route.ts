import { NextResponse } from 'next/server';
import {
  getProfileByUserId,
  getUserByDiscordId,
  toViewerAvailabilityContext,
} from '@/db';
import { countDiscovery, listDiscoveryPage } from '@/db/discovery';
import { parseDiscoveryState } from '@/features/Discovery/discoveryUrlState';
import { getStaffRole } from '@/lib/admin';
import { getCurrentUser } from '@/lib/auth';
import { withModerationStates } from '@/lib/moderation';
import { measureStartup, startupResponse } from '@/lib/startupProbe';

async function discover(request: Request) {
  const { searchParams } = new URL(request.url);
  const user = await measureStartup('auth', () => getCurrentUser());
  const persistedUser = user ? await getUserByDiscordId(user.id) : null;
  const profile = persistedUser
    ? await getProfileByUserId(persistedUser.id)
    : null;
  const state = parseDiscoveryState(searchParams);
  const locale = searchParams.get('locale') === 'ja' ? 'ja' : 'en';
  const viewer = profile ? toViewerAvailabilityContext(profile.profile) : {};
  let data =
    searchParams.get('count') === '1'
      ? {
          total: await measureStartup('count', () =>
            countDiscovery(state, locale, viewer, persistedUser?.id),
          ),
        }
      : await measureStartup('discovery', () =>
          listDiscoveryPage(
            state,
            locale,
            viewer,
            persistedUser?.id,
            searchParams.get('stack') === '1',
          ),
        );
  if ('profiles' in data && user && (await getStaffRole(user))) {
    data = { ...data, profiles: await withModerationStates(data.profiles) };
  }
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export const GET = (request: Request) =>
  startupResponse('app-handler', () => discover(request));

import { NextResponse } from 'next/server';
import {
  getProfileByUserId,
  getUserByDiscordId,
  toViewerAvailabilityContext,
} from '@/db';
import { countDiscovery, listDiscoveryPage } from '@/db/discovery';
import { parseDiscoveryState } from '@/features/Discovery/discoveryUrlState';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user = await getCurrentUser();
  const persistedUser = user ? await getUserByDiscordId(user.id) : null;
  const profile = persistedUser
    ? await getProfileByUserId(persistedUser.id)
    : null;
  const state = parseDiscoveryState(searchParams);
  const locale = searchParams.get('locale') === 'ja' ? 'ja' : 'en';
  const viewer = profile ? toViewerAvailabilityContext(profile.profile) : {};
  const data =
    searchParams.get('count') === '1'
      ? {
          total: await countDiscovery(state, locale, viewer, persistedUser?.id),
        }
      : await listDiscoveryPage(
          state,
          locale,
          viewer,
          persistedUser?.id,
          searchParams.get('stack') === '1',
        );
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

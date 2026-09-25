import { NextResponse } from 'next/server';
import {
  getProfileByUserId,
  getUserByDiscordId,
  toViewerAvailabilityContext,
} from '@/db';
import { listDiscoveryPage } from '@/db/discovery';
import { parseDiscoveryState } from '@/features/Discovery/discoveryUrlState';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user = await getCurrentUser();
  const persistedUser = user ? await getUserByDiscordId(user.id) : null;
  const profile = persistedUser
    ? await getProfileByUserId(persistedUser.id)
    : null;
  const data = await listDiscoveryPage(
    parseDiscoveryState(searchParams),
    searchParams.get('locale') === 'ja' ? 'ja' : 'en',
    profile ? toViewerAvailabilityContext(profile.profile) : {},
    persistedUser?.id,
    searchParams.get('stack') === '1',
  );
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

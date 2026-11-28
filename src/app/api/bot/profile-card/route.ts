import { NextResponse } from 'next/server';
import { getPublicProfileByDiscordUserId } from '@/db';
import { scopedRoute } from '@/db/client';
import { botUnauthorized, isBotRequest } from '@/lib/botAuth';
import { discordCardImagePath } from '@/lib/discordCard';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

export const GET = scopedRoute(async (request: Request) => {
  if (!isBotRequest(request)) return botUnauthorized();

  const discordUserId = new URL(request.url).searchParams.get('discordUserId');
  if (!discordUserId || !/^\d{1,32}$/.test(discordUserId)) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400, headers: noStore },
    );
  }

  const row = await getPublicProfileByDiscordUserId(discordUserId);
  if (!row) {
    return NextResponse.json(
      { error: 'Profile not found' },
      { status: 404, headers: noStore },
    );
  }

  return NextResponse.json(
    {
      profilePath: `/en/u/${row.profile.id}`,
      cardPath: discordCardImagePath(row),
    },
    { headers: noStore },
  );
});

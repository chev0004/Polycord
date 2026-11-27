import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPublicProfileById } from '@/db';
import { scopedRoute } from '@/db/client';
import { renderDiscordCardImage } from '@/features/Profile/DiscordCard/image/render';
import { discordCardFor } from '@/lib/discordCard';

export const GET = scopedRoute(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const id = z.uuid().safeParse((await params).id);
    const row = id.success ? await getPublicProfileById(id.data) : null;

    if (!row) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return renderDiscordCardImage({
      ...discordCardFor(row),
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' },
    });
  },
);

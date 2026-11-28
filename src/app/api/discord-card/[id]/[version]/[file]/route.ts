import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPublicProfileById } from '@/db';
import { scopedRoute } from '@/db/client';
import {
  renderDiscordCardBase,
  stampDiscordCardClock,
} from '@/features/Profile/DiscordCard/image/render';
import { discordCardFor, discordCardVersion } from '@/lib/discordCard';

const notFound = () =>
  NextResponse.json({ error: 'Profile not found' }, { status: 404 });

const gif = (body: Buffer) =>
  new Response(new Uint8Array(body), {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
    },
  });

export const GET = scopedRoute(
  async (
    request: Request,
    {
      params,
    }: { params: Promise<{ id: string; version: string; file: string }> },
  ) => {
    const { id, version, file } = await params;
    const parsed = z.uuid().safeParse(id);
    const row = parsed.success ? await getPublicProfileById(parsed.data) : null;
    const minute = /^(\d+)\.gif$/.exec(file)?.[1];

    if (
      !row ||
      discordCardVersion(row) !== version ||
      (file !== 'base.gif' && !minute)
    ) {
      return notFound();
    }

    if (!minute) return gif(await renderDiscordCardBase(discordCardFor(row)));

    const base = await fetch(
      new URL(`/api/discord-card/${id}/${version}/base.gif`, request.url),
    );
    if (!base.ok) return notFound();
    return gif(
      await stampDiscordCardClock(
        Buffer.from(await base.arrayBuffer()),
        discordCardFor(row, new Date(Number(minute) * 60000)),
      ),
    );
  },
);

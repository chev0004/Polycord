import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPublicProfileById } from '@/db';
import { scopedRoute } from '@/db/client';
import {
  renderDiscordCardBase,
  renderDiscordCardStill,
  stampDiscordCardClock,
} from '@/features/Profile/DiscordCard/image/render';
import {
  discordCardExtension,
  discordCardFor,
  discordCardVersion,
} from '@/lib/discordCard';

const notFound = () =>
  NextResponse.json({ error: 'Profile not found' }, { status: 404 });

const image = (type: string, body: Buffer) =>
  new Response(new Uint8Array(body), {
    headers: {
      'Content-Type': type,
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
    const [, minute, extension] = /^(\d+)\.(gif|png)$/.exec(file) ?? [];

    if (
      !row ||
      discordCardVersion(row) !== version ||
      (file !== 'base.gif' &&
        extension !== discordCardExtension(discordCardFor(row)))
    ) {
      return notFound();
    }

    if (!minute)
      return image(
        'image/gif',
        await renderDiscordCardBase(discordCardFor(row)),
      );

    const card = discordCardFor(row, new Date(Number(minute) * 60000));
    if (extension === 'png')
      return image('image/png', await renderDiscordCardStill(card));

    const base = await fetch(
      new URL(`/api/discord-card/${id}/${version}/base.gif`, request.url),
    );
    if (!base.ok) return notFound();
    return image(
      'image/gif',
      await stampDiscordCardClock(Buffer.from(await base.arrayBuffer()), card),
    );
  },
);

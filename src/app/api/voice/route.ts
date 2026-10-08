import { NextResponse } from 'next/server';
import { listPlayableVoiceIntros } from '@/db';
import { gatedRoute } from '@/lib/gatedRoute';

const MAX_BATCH = 12;

export const GET = gatedRoute(async ({ user, measure }, request: Request) => {
  const ids = new URL(request.url).searchParams.get('ids')?.split(',') ?? [];
  const clips = await measure('voice', () =>
    listPlayableVoiceIntros(
      [...new Set(ids)].slice(0, MAX_BATCH),
      user?.accountId,
    ),
  );

  return NextResponse.json(
    {
      clips: Object.fromEntries(
        clips.map(({ profileId, mimeType, data }) => [
          profileId,
          { mimeType, data },
        ]),
      ),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
});

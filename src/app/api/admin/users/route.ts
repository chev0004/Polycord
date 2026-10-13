import { NextResponse } from 'next/server';
import { scopedRoute } from '@/db/client';
import { getStaffAccess } from '@/lib/admin';
import { searchModeration } from '@/lib/moderation';

export const GET = scopedRoute(async (request: Request) => {
  if (!(await getStaffAccess())) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const query = (new URL(request.url).searchParams.get('q') ?? '')
    .trim()
    .replace(/^@/, '')
    .slice(0, 64);

  if (!query) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  const offset = Number(new URL(request.url).searchParams.get('offset') ?? 0);

  return NextResponse.json(
    await searchModeration(
      query,
      Number.isSafeInteger(offset) && offset > 0 ? Math.min(offset, 10000) : 0,
    ),
  );
});

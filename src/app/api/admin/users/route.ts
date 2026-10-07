import { NextResponse } from 'next/server';
import { scopedRoute } from '@/db/client';
import { getStaffRole } from '@/lib/admin';
import { getCurrentUser } from '@/lib/auth';
import { searchModeration } from '@/lib/moderation';

export const GET = scopedRoute(async (request: Request) => {
  const currentUser = await getCurrentUser();

  if (!currentUser || !(await getStaffRole(currentUser))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const query = (new URL(request.url).searchParams.get('q') ?? '')
    .trim()
    .replace(/^@/, '')
    .slice(0, 64);

  if (!query) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  return NextResponse.json(await searchModeration(query));
});

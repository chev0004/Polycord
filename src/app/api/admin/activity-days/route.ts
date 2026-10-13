import { NextResponse } from 'next/server';
import { scopedRoute } from '@/db/client';
import { parseActivityDays } from '@/lib/activityWindow';
import { getStaffAccess } from '@/lib/admin';
import { loadActivityDays } from '@/lib/moderation';

export const GET = scopedRoute(async (request: Request) => {
  if (!(await getStaffAccess())) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const query = parseActivityDays(new URL(request.url).searchParams);

  if (!query) {
    return NextResponse.json({ error: 'Invalid range' }, { status: 400 });
  }

  return NextResponse.json(await loadActivityDays(query));
});

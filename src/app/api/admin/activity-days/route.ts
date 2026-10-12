import { NextResponse } from 'next/server';
import { scopedRoute } from '@/db/client';
import { parseActivityDays } from '@/lib/activityWindow';
import { getStaffRole } from '@/lib/admin';
import { getCurrentUser } from '@/lib/auth';
import { loadActivityDays } from '@/lib/moderation';

export const GET = scopedRoute(async (request: Request) => {
  const currentUser = await getCurrentUser();

  if (!currentUser || !(await getStaffRole(currentUser))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const query = parseActivityDays(new URL(request.url).searchParams);

  if (!query) {
    return NextResponse.json({ error: 'Invalid range' }, { status: 400 });
  }

  return NextResponse.json(await loadActivityDays(query));
});

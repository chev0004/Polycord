import { NextResponse } from 'next/server';
import { scopedRoute } from '@/db/client';
import { parseActivityWindow } from '@/lib/activityWindow';
import { getStaffRole } from '@/lib/admin';
import { getCurrentUser } from '@/lib/auth';
import { loadActivityLogPage } from '@/lib/moderation';

export const GET = scopedRoute(async (request: Request) => {
  const currentUser = await getCurrentUser();

  if (!currentUser || !(await getStaffRole(currentUser))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const window = parseActivityWindow(new URL(request.url).searchParams);

  if (!window) {
    return NextResponse.json({ error: 'Invalid range' }, { status: 400 });
  }

  return NextResponse.json(await loadActivityLogPage(window));
});

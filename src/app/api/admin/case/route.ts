import { NextResponse } from 'next/server';
import { scopedRoute } from '@/db/client';
import { getStaffRole } from '@/lib/admin';
import { getCurrentUser } from '@/lib/auth';
import { loadProfileCase } from '@/lib/moderation';

export const GET = scopedRoute(async (request: Request) => {
  const currentUser = await getCurrentUser();

  if (!currentUser || !(await getStaffRole(currentUser))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const profileId = new URL(request.url).searchParams.get('profileId') ?? '';
  const found = await loadProfileCase(profileId);

  if (!found) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(found, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
});

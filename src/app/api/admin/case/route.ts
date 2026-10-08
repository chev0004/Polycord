import { NextResponse } from 'next/server';
import { getStaffRole } from '@/lib/admin';
import { gatedRoute } from '@/lib/gatedRoute';
import { loadProfileCase } from '@/lib/moderation';

export const GET = gatedRoute(
  async ({ user: currentUser, measure }, request: Request) => {
    if (!currentUser) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const profileId = new URL(request.url).searchParams.get('profileId') ?? '';
    const [role, found] = await Promise.all([
      measure('staff', () => getStaffRole(currentUser)),
      measure('case', () => loadProfileCase(profileId)),
    ]);

    if (!role || !found) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(found, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  },
);

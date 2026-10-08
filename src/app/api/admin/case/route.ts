import { NextResponse } from 'next/server';
import { getStaffRole } from '@/lib/admin';
import { gatedRoute } from '@/lib/gatedRoute';
import { loadProfileCase } from '@/lib/moderation';

export const GET = gatedRoute(
  async ({ user: currentUser, measure }, request: Request) => {
    if (
      !currentUser ||
      !(await measure('staff', () => getStaffRole(currentUser)))
    ) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const profileId = new URL(request.url).searchParams.get('profileId') ?? '';
    const found = await measure('case', () => loadProfileCase(profileId));

    if (!found) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(found, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  },
);

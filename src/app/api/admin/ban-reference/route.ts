import { NextResponse } from 'next/server';
import { scopedRoute } from '@/db/client';
import { getStaffAccess } from '@/lib/admin';
import { findBanByReference } from '@/lib/moderation';

const REFERENCE = /^PC-[0-9A-Z]{4}-[0-9A-Z]{4}$/;

export const GET = scopedRoute(async (request: Request) => {
  if (!(await getStaffAccess())) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const reference = (new URL(request.url).searchParams.get('reference') ?? '')
    .trim()
    .toUpperCase();

  return NextResponse.json({
    ban: REFERENCE.test(reference) ? await findBanByReference(reference) : null,
  });
});

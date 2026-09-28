import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getBlockedProfilePreview } from '@/db';
import { getActiveUser } from '@/lib/auth';

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) => {
  const currentUser = await getActiveUser();
  if (!currentUser)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId } = await params;
  if (!z.uuid().safeParse(userId).success)
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
  const profile = await getBlockedProfilePreview(currentUser.accountId, userId);
  if (!profile)
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  return NextResponse.json(
    { profile },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
};

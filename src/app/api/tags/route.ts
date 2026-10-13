import { NextResponse } from 'next/server';
import { scopedRoute } from '@/db/client';
import { suggestTags } from '@/db/discovery';
import { getActiveUser } from '@/lib/auth';
import { entitlementLimit } from '@/lib/entitlements';

const MAX_QUERY_LENGTH = 20;

export const GET = scopedRoute(async (request: Request) => {
  const currentUser = await getActiveUser();
  if (!currentUser)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const tags = await suggestTags(
    currentUser.accountId,
    (searchParams.get('q') ?? '').slice(0, MAX_QUERY_LENGTH),
    searchParams
      .getAll('exclude')
      .slice(0, entitlementLimit('profile.tags', true)),
  );
  return NextResponse.json(
    { tags },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
});

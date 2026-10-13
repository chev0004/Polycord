import { NextResponse } from 'next/server';
import { z } from 'zod';
import { scopedRoute } from '@/db/client';
import { parseActivityWindow } from '@/lib/activityWindow';
import { getStaffAccess } from '@/lib/admin';
import { loadSuspiciousEvents, loadSuspiciousPage } from '@/lib/moderation';

export const GET = scopedRoute(async (request: Request) => {
  if (!(await getStaffAccess())) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const params = new URL(request.url).searchParams;
  const window = parseActivityWindow(params);
  const userId = params.get('userId');

  if (!window || (userId && !z.string().uuid().safeParse(userId).success)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (userId) {
    const offset = z.coerce
      .number()
      .int()
      .min(0)
      .catch(0)
      .parse(params.get('offset') ?? 0);
    return NextResponse.json(
      await loadSuspiciousEvents(userId, window, offset),
    );
  }

  return NextResponse.json(await loadSuspiciousPage(window));
});

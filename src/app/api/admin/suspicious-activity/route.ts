import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseActivityWindow } from '@/lib/activityWindow';
import { getStaffRole } from '@/lib/admin';
import { getCurrentUser } from '@/lib/auth';
import { loadSuspiciousEvents, loadSuspiciousPage } from '@/lib/moderation';

export const GET = async (request: Request) => {
  const currentUser = await getCurrentUser();

  if (!currentUser || !(await getStaffRole(currentUser))) {
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
};

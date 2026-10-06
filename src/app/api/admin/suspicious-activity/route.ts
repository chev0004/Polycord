import { NextResponse } from 'next/server';
import { z } from 'zod';
import { listSuspiciousEvents, listSuspiciousGroups } from '@/db';
import { getStaffRole } from '@/lib/admin';
import { getCurrentUser } from '@/lib/auth';

const toEvent = (row: {
  id: string;
  action: string;
  userId: string | null;
  ip: string | null;
  createdAt: Date;
}) => ({
  id: row.id,
  action: row.action,
  userId: row.userId,
  ip: row.ip,
  createdAt: row.createdAt.toISOString(),
});

export const GET = async (request: Request) => {
  const currentUser = await getCurrentUser();

  if (!currentUser || !(await getStaffRole(currentUser))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (userId) {
    if (!z.string().uuid().safeParse(userId).success) {
      return NextResponse.json({ error: 'Invalid user' }, { status: 400 });
    }
    const offset = z.coerce
      .number()
      .int()
      .min(0)
      .catch(0)
      .parse(searchParams.get('offset') ?? 0);
    const { events, hasMore } = await listSuspiciousEvents(userId, offset);
    return NextResponse.json({ events: events.map(toEvent), hasMore });
  }

  return NextResponse.json({
    activity: (await listSuspiciousGroups()).map((row) => ({
      ...toEvent(row),
      count: row.total,
    })),
  });
};

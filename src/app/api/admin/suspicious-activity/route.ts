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

  const userId = new URL(request.url).searchParams.get('userId');

  if (userId) {
    if (!z.string().uuid().safeParse(userId).success) {
      return NextResponse.json({ error: 'Invalid user' }, { status: 400 });
    }
    return NextResponse.json({
      events: (await listSuspiciousEvents(userId)).map(toEvent),
    });
  }

  return NextResponse.json({
    activity: (await listSuspiciousGroups()).map((row) => ({
      ...toEvent(row),
      count: row.total,
    })),
  });
};

import { NextResponse } from 'next/server';
import { listSuspiciousActivity } from '@/db';
import { isAdmin } from '@/lib/admin';
import { getCurrentUser } from '@/lib/auth';

export const GET = async () => {
  const currentUser = await getCurrentUser();

  if (!currentUser || !isAdmin(currentUser)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const rows = await listSuspiciousActivity();

  return NextResponse.json({
    activity: rows.map((row) => ({
      id: row.id,
      action: row.action,
      userId: row.userId,
      ip: row.ip,
      createdAt: row.createdAt.toISOString(),
    })),
  });
};

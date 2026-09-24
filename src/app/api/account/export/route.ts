import { NextResponse } from 'next/server';
import { getAccountExportByUserId } from '@/db';
import { getCurrentUser } from '@/lib/auth';

export const GET = async () => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accountExport = await getAccountExportByUserId(currentUser.accountId);

  if (!accountExport) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  return NextResponse.json(accountExport, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Disposition':
        'attachment; filename="polycord-account-export.json"',
    },
  });
};

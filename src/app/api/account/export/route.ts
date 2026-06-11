import { NextResponse } from 'next/server';
import { getAccountExportByDiscordId } from '@/db';
import { getCurrentUser } from '@/lib/auth';

export const GET = async () => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accountExport = await getAccountExportByDiscordId(currentUser.id);

  if (!accountExport) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  return NextResponse.json(accountExport, {
    headers: {
      'Content-Disposition':
        'attachment; filename="polycord-account-export.json"',
    },
  });
};

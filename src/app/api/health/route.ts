import { NextResponse } from 'next/server';
import { pingDatabase } from '@/db';

export const dynamic = 'force-dynamic';

export const GET = async () => {
  try {
    await pingDatabase();
    return NextResponse.json({ status: 'ok' });
  } catch {
    return NextResponse.json({ status: 'unavailable' }, { status: 503 });
  }
};

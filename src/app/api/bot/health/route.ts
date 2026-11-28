import { NextResponse } from 'next/server';
import { botUnauthorized, isBotRequest } from '@/lib/botAuth';

export const dynamic = 'force-dynamic';

export const GET = (request: Request) =>
  isBotRequest(request)
    ? NextResponse.json(
        { status: 'ok' },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    : botUnauthorized();

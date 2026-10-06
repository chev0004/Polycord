import { NextResponse } from 'next/server';
import { BAN_CHECK_AUTH_HEADER, isBanCheckToken } from '@/lib/auth-session';
import { withBanDeadline } from '@/lib/banDeadline';
import { lookupBan } from '@/lib/banLookup';
import { normalizeIp } from '@/lib/clientIp';
import { probeFailure, startupResponse } from '@/lib/startupProbe';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

const handlePost = async (request: Request) => {
  if (!(await isBanCheckToken(request.headers.get(BAN_CHECK_AUTH_HEADER)))) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403, headers: noStore },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    ip: string | null;
    discordUserIds: string[];
  } | null;

  if (
    !body ||
    !Array.isArray(body.discordUserIds) ||
    !body.discordUserIds.every((id) => typeof id === 'string') ||
    (body.ip !== null && typeof body.ip !== 'string')
  ) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400, headers: noStore },
    );
  }

  try {
    const ban = await withBanDeadline((signal) =>
      lookupBan(normalizeIp(body.ip), body.discordUserIds, signal),
    );

    return NextResponse.json(
      {
        ban: ban && { date: ban.date.toISOString(), reference: ban.reference },
      },
      { headers: noStore },
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Unavailable' },
      { status: 503, headers: { ...noStore, ...probeFailure(error) } },
    );
  }
};

export const POST = (request: Request) =>
  startupResponse('ban-handler', () => handlePost(request));

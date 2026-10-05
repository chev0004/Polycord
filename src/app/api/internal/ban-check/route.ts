import { NextResponse } from 'next/server';
import { BAN_CHECK_AUTH_HEADER, isBanCheckToken } from '@/lib/auth-session';
import { lookupBan } from '@/lib/banLookup';
import { normalizeIp } from '@/lib/clientIp';

export const dynamic = 'force-dynamic';

const LOOKUP_DEADLINE_MS = 3000;
const noStore = { 'Cache-Control': 'no-store' };

const deadline = () =>
  new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error('Ban lookup timed out')),
      LOOKUP_DEADLINE_MS,
    ),
  );

export const POST = async (request: Request) => {
  if (!(await isBanCheckToken(request.headers.get(BAN_CHECK_AUTH_HEADER)))) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403, headers: noStore },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    ip?: unknown;
    discordUserIds?: unknown;
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
    const ban = await Promise.race([
      lookupBan(normalizeIp(body.ip), body.discordUserIds),
      deadline(),
    ]);

    return NextResponse.json(
      {
        ban: ban && { date: ban.date.toISOString(), reference: ban.reference },
      },
      { headers: noStore },
    );
  } catch {
    return NextResponse.json(
      { error: 'Unavailable' },
      { status: 503, headers: noStore },
    );
  }
};

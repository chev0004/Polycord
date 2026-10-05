import { NextResponse } from 'next/server';
import { BAN_CHECK_AUTH_HEADER, isBanCheckToken } from '@/lib/auth-session';
import { lookupBan } from '@/lib/banLookup';
import { normalizeIp } from '@/lib/clientIp';
import { startupResponse } from '@/lib/startupProbe';

export const dynamic = 'force-dynamic';

const LOOKUP_DEADLINE_MS = 3000;
const noStore = { 'Cache-Control': 'no-store' };

const withDeadline = async <T>(run: (signal: AbortSignal) => Promise<T>) => {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Ban lookup timed out'));
    }, LOOKUP_DEADLINE_MS);
  });

  try {
    return await Promise.race([run(controller.signal), expired]);
  } finally {
    clearTimeout(timer);
  }
};

const check = async (request: Request) => {
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
    const ban = await withDeadline((signal) =>
      lookupBan(normalizeIp(body.ip), body.discordUserIds, signal),
    );

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

export const POST = (request: Request) =>
  startupResponse('ban-handler', () => check(request));

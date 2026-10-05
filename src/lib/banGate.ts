import {
  AUTH_BAN_COOKIE,
  AUTH_SESSION_COOKIE,
  BAN_CHECK_AUTH_HEADER,
  createBanCheckToken,
  readBanCookieValue,
  readSessionFromCookieValue,
} from './auth-session';
import { withBanDeadline } from './banDeadline';
import { clientIp } from './clientIp';

export type BanNotice = { date: Date; reference: string };

export const BAN_CHECK_PATH = '/api/internal/ban-check';
export const BAN_CHECK_TIMEOUT_MS = 12000;

const isBanNotice = (
  value: unknown,
): value is { date: string; reference: string } =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { date?: unknown }).date === 'string' &&
  !Number.isNaN(Date.parse((value as { date: string }).date)) &&
  typeof (value as { reference?: unknown }).reference === 'string';

export const findBan = async (
  origin: string,
  headers: Headers,
  cookie: (name: string) => string | undefined,
  observe?: (value: string | null) => void,
): Promise<BanNotice | null> => {
  const sessionCookie = cookie(AUTH_SESSION_COOKIE);
  const banCookie = cookie(AUTH_BAN_COOKIE);
  const [session, banned, token] = await Promise.all([
    sessionCookie ? readSessionFromCookieValue(sessionCookie) : null,
    banCookie ? readBanCookieValue(banCookie) : null,
    createBanCheckToken(),
  ]);

  if (!token) {
    throw new Error('Ban check token unavailable');
  }

  const input = {
    ip: clientIp(headers),
    discordUserIds: [session?.id, banned].flatMap((id) => id ?? []),
  };

  if (process.env.POLYCORD_DIRECT_BAN_CHECK === 'true') {
    const { lookupBan } = await import('./banLookup');
    return withBanDeadline((signal) =>
      lookupBan(input.ip, input.discordUserIds, signal),
    );
  }

  const response = await fetch(new URL(BAN_CHECK_PATH, origin), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [BAN_CHECK_AUTH_HEADER]: token,
    },
    body: JSON.stringify(input),
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(BAN_CHECK_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Ban check failed with ${response.status}`);
  }

  observe?.(response.headers.get('x-disc027-timing'));

  const { ban } = (await response.json()) as { ban?: unknown };

  if (ban === null) {
    return null;
  }

  if (!isBanNotice(ban)) {
    throw new Error('Ban check returned an invalid response');
  }

  return { date: new Date(ban.date), reference: ban.reference };
};

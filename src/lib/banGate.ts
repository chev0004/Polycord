import 'server-only';

import { createHash } from 'node:crypto';
import { findActiveIpBan, findBannedAt } from '@/db';
import {
  AUTH_BAN_COOKIE,
  AUTH_SESSION_COOKIE,
  readBanCookieValue,
  readSessionFromCookieValue,
} from './auth-session';
import { clientIp } from './clientIp';

export type BanNotice = { date: Date; reference: string };

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export const banReference = (seed: string) => {
  const digest = createHash('sha256').update(seed).digest();
  const code = Array.from(digest.subarray(0, 8), (byte) => ALPHABET[byte % 32]);
  return `PC-${code.slice(0, 4).join('')}-${code.slice(4).join('')}`;
};

export const findBan = async (
  headers: Headers,
  cookie: (name: string) => string | undefined,
): Promise<BanNotice | null> => {
  const ip = clientIp(headers);
  const ipBan = ip ? await findActiveIpBan(ip) : null;

  if (ipBan) {
    return { date: ipBan.createdAt, reference: banReference(ipBan.id) };
  }

  const sessionCookie = cookie(AUTH_SESSION_COOKIE);
  const banCookie = cookie(AUTH_BAN_COOKIE);
  const [session, banned] = await Promise.all([
    sessionCookie ? readSessionFromCookieValue(sessionCookie) : null,
    banCookie ? readBanCookieValue(banCookie) : null,
  ]);
  const discordUserIds = [session?.id, banned].flatMap((id) => id ?? []);
  const bannedAt = await findBannedAt(discordUserIds);

  return bannedAt
    ? { date: bannedAt, reference: banReference(discordUserIds.join('+')) }
    : null;
};

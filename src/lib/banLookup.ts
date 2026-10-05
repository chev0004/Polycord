import 'server-only';

import { createHash } from 'node:crypto';
import { findActiveIpBan, findBannedAt } from '@/db';
import type { BanNotice } from './banGate';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export const banReference = (seed: string) => {
  const digest = createHash('sha256').update(seed).digest();
  const code = Array.from(digest.subarray(0, 8), (byte) => ALPHABET[byte % 32]);
  return `PC-${code.slice(0, 4).join('')}-${code.slice(4).join('')}`;
};

export const lookupBan = async (
  ip: string | null,
  discordUserIds: string[],
): Promise<BanNotice | null> => {
  const ipBan = ip ? await findActiveIpBan(ip) : null;

  if (ipBan) {
    return { date: ipBan.createdAt, reference: banReference(ipBan.id) };
  }

  const bannedAt = await findBannedAt(discordUserIds);

  return bannedAt
    ? { date: bannedAt, reference: banReference(discordUserIds.join('+')) }
    : null;
};

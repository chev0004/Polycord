import 'server-only';

import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { createBanClient } from '@/db/client';
import { findActiveIpBan, findBannedAt } from '@/db/ipBans';
import type { BanNotice } from './banGate';

export const BAN_STATEMENT_TIMEOUT_MS = 2500;

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export const banReference = (seed: string) => {
  const digest = createHash('sha256').update(seed).digest();
  const code = Array.from(digest.subarray(0, 8), (byte) => ALPHABET[byte % 32]);
  return `PC-${code.slice(0, 4).join('')}-${code.slice(4).join('')}`;
};

export const lookupBan = async (
  ip: string | null,
  discordUserIds: string[],
  signal: AbortSignal,
): Promise<BanNotice | null> => {
  signal.throwIfAborted();
  const client = createBanClient(signal);

  try {
    await client.connect();
    return await drizzle(client).transaction(async (tx) => {
      signal.throwIfAborted();
      await tx.execute(
        sql`select set_config('statement_timeout', ${String(BAN_STATEMENT_TIMEOUT_MS)}, true)`,
      );
      const ipBan = ip ? await findActiveIpBan(ip, tx) : null;

      if (ipBan) {
        return { date: ipBan.createdAt, reference: banReference(ipBan.id) };
      }

      signal.throwIfAborted();
      const bannedAt = await findBannedAt(discordUserIds, tx);

      return bannedAt
        ? { date: bannedAt, reference: banReference(discordUserIds.join('+')) }
        : null;
    });
  } finally {
    const closed = client.end();
    if ('Deno' in globalThis) {
      client.connection.stream.destroy();
      client.connection.emit('end');
    }
    await closed;
  }
};

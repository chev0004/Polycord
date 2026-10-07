import 'server-only';

import { createHash } from 'node:crypto';
import { createBanClient } from '@/db/connection';
import type { BanNotice } from './banGate';
import { type LoadMeasure, measureLoad } from './loadTrace';

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
  measure: LoadMeasure = measureLoad,
): Promise<BanNotice | null> => {
  signal.throwIfAborted();
  const client = createBanClient(signal);

  try {
    await measure('ban-connect', () => client.connect());
    await client.query('begin');
    try {
      signal.throwIfAborted();
      await client.query("select set_config('statement_timeout', $1, true)", [
        String(BAN_STATEMENT_TIMEOUT_MS),
      ]);
      const ipBan = ip
        ? (
            await measure('ban-ip', () =>
              client.query<{ id: string; created_at: Date }>(
                'select id, created_at from ip_bans where ip = $1 and revoked_at is null order by created_at asc limit 1',
                [ip],
              ),
            )
          ).rows[0]
        : null;
      let notice: BanNotice | null = null;
      if (ipBan) {
        notice = { date: ipBan.created_at, reference: banReference(ipBan.id) };
      } else if (discordUserIds.length) {
        signal.throwIfAborted();
        const dates: number[] = [];
        for (const table of ['users', 'moderation_restrictions']) {
          const { rows } = await measure('ban-identity', () =>
            client.query<{ at: Date }>(
              `select banned_at as at from ${table} where discord_user_id = any($1::varchar[]) and banned_at is not null`,
              [discordUserIds],
            ),
          );
          dates.push(...rows.map(({ at }) => Number(at)));
        }
        if (dates.length)
          notice = {
            date: new Date(Math.min(...dates)),
            reference: banReference(discordUserIds.join('+')),
          };
      }
      await client.query('commit');
      return notice;
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  } finally {
    const closed = client.end();
    if ('Deno' in globalThis) {
      client.connection.stream.destroy();
      client.connection.emit('end');
    }
    await measure('ban-close', () => closed);
  }
};

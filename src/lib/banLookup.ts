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

type BanRow = { kind: 'ip' | 'identity'; ref: string | null; at: Date };

export const lookupBan = async (
  ip: string | null,
  discordUserIds: string[],
  signal: AbortSignal,
  measure: LoadMeasure = measureLoad,
): Promise<BanNotice | null> => {
  signal.throwIfAborted();
  const client = createBanClient(signal);

  try {
    const ids = `array[${discordUserIds.map((id) => client.escapeLiteral(id)).join(',')}]::varchar[]`;
    const found = [
      ip &&
        `(select 'ip' as kind, id::text as ref, created_at as at from ip_bans where ip = ${client.escapeLiteral(ip)} and revoked_at is null order by created_at asc limit 1)`,
      discordUserIds.length &&
        `select 'identity' as kind, null as ref, banned_at as at from users where discord_user_id = any(${ids}) and banned_at is not null`,
      discordUserIds.length &&
        `select 'identity' as kind, null as ref, banned_at as at from moderation_restrictions where discord_user_id = any(${ids}) and banned_at is not null`,
    ].filter(Boolean);
    if (!found.length) return null;
    await measure('ban-connect', () => client.connect());
    const results = await measure('ban-query', () =>
      client.query<BanRow>(
        `begin; set local statement_timeout = ${BAN_STATEMENT_TIMEOUT_MS}; ${found.join(' union all ')}; commit`,
      ),
    );
    const rows = (results as unknown as { rows: BanRow[] }[])[2].rows;
    const ipBan = rows.find(({ kind }) => kind === 'ip');
    if (ipBan)
      return { date: ipBan.at, reference: banReference(ipBan.ref ?? '') };
    if (!rows.length) return null;
    return {
      date: new Date(Math.min(...rows.map(({ at }) => Number(at)))),
      reference: banReference(discordUserIds.join('+')),
    };
  } finally {
    const closed = client.end();
    if ('Deno' in globalThis) {
      client.connection.stream.destroy();
      client.connection.emit('end');
    }
    await measure('ban-close', () => closed);
  }
};

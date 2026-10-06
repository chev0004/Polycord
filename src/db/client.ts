import 'server-only';

import { Socket } from 'node:net';
import { type ExtractTablesWithRelations, sql } from 'drizzle-orm';
import { drizzle, NodePgTransaction } from 'drizzle-orm/node-postgres';
import { PgDialect } from 'drizzle-orm/pg-core';
import { Client, Pool } from 'pg';
import * as schema from './schema';
import supabaseCa from './supabaseCa.json';

declare global {
  var polycordPool: Pool | undefined;
}

const connectionConfig = () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to connect to the database.');
  }

  const url = new URL(databaseUrl);
  for (const key of ['ssl', 'sslmode', 'sslcert', 'sslkey', 'sslrootcert']) {
    url.searchParams.delete(key);
  }
  return {
    connectionString: url.href,
    connectionTimeoutMillis: 3000,
    ssl: ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      ? false
      : {
          rejectUnauthorized: true,
          ...(url.hostname.endsWith('.pooler.supabase.com') && {
            ca: supabaseCa,
          }),
        },
  };
};

export const createBanClient = (signal: AbortSignal) => {
  const client = new Client({
    ...connectionConfig(),
    query_timeout: 2500,
    stream: () => new Socket({ signal }),
  });
  if ('Deno' in globalThis) {
    client.connection.once('sslconnect', () => {
      const abort = () => {
        client.connection.stream.destroy();
        client.connection.emit('end');
      };
      signal.addEventListener('abort', abort, { once: true });
      client.once('end', () => signal.removeEventListener('abort', abort));
      if (signal.aborted) abort();
    });
  }
  client.on('error', () => {});
  return client;
};

const pool =
  globalThis.polycordPool ??
  new Pool({
    ...connectionConfig(),
    max: 2,
    query_timeout: 10000,
    idleTimeoutMillis: 20000,
  });
pool.on('error', () => {});

if (process.env.NODE_ENV !== 'production') {
  globalThis.polycordPool = pool;
}

export const db = drizzle(pool, { schema });

db.transaction = async (transaction, config) => {
  const client = await pool.connect();
  const onError = () => {};
  client.on('error', onError);
  const connection = drizzle(client, { schema });
  const tx = new NodePgTransaction<
    typeof schema,
    ExtractTablesWithRelations<typeof schema>
  >(new PgDialect(), connection._.session, {
    fullSchema: schema,
    schema: connection._.schema as ExtractTablesWithRelations<typeof schema>,
    tableNamesMap: connection._.tableNamesMap,
  });
  let committed = false;
  try {
    await tx.execute(sql`begin`);
    if (config && Object.values(config).some((value) => value !== undefined)) {
      await tx.setTransaction(config);
    }
    const result = await transaction(tx);
    await tx.execute(sql`commit`);
    committed = true;
    return result;
  } finally {
    client.release(!committed);
    client.removeListener('error', onError);
  }
};

import 'server-only';

import { Socket } from 'node:net';
import { type ExtractTablesWithRelations, sql } from 'drizzle-orm';
import { drizzle, NodePgTransaction } from 'drizzle-orm/node-postgres';
import { PgDialect } from 'drizzle-orm/pg-core';
import { Client, Pool } from 'pg';
import { captureDuration, observeDuration } from '@/lib/startupProbe';
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
  const socket = new Socket({ signal });
  const client = new Client({
    ...connectionConfig(),
    query_timeout: 2500,
    stream: () => socket,
  });
  if ('Deno' in globalThis) {
    client.connection.once('sslconnect', () => {
      const secure = client.connection.stream;
      socket.once('close', () => secure.destroy());
      secure.once('close', () => socket.destroy());
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

if (process.env.DISC027_TIMING === 'true') {
  const connect = pool.connect;
  pool.connect = function (this: Pool, ...args: unknown[]) {
    const finish = captureDuration('pool-acquire');
    if (typeof args[0] === 'function') {
      const callback = args[0];
      args[0] = (...values: unknown[]) => {
        finish();
        Reflect.apply(callback, this, values);
      };
    }
    const result = Reflect.apply(connect, this, args);
    return result?.finally ? result.finally(finish) : result;
  } as typeof pool.connect;
  const query = pool.query;
  pool.query = function (this: Pool, ...args: unknown[]) {
    const started = performance.now();
    const result = Reflect.apply(query, this, args);
    return result?.finally
      ? result.finally(() => {
          observeDuration('sql', performance.now() - started);
          observeDuration('sql-count', 1);
        })
      : result;
  } as typeof pool.query;
}

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

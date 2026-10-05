import 'server-only';

import { Socket } from 'node:net';
import { drizzle } from 'drizzle-orm/node-postgres';
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

  const { hostname } = new URL(databaseUrl);
  return {
    connectionString: databaseUrl,
    connectionTimeoutMillis: 3000,
    query_timeout: 2500,
    ssl: ['localhost', '127.0.0.1'].includes(hostname)
      ? false
      : {
          rejectUnauthorized: true,
          ...(hostname.endsWith('.pooler.supabase.com') && { ca: supabaseCa }),
        },
  };
};

export const createBanClient = (signal: AbortSignal) => {
  const client = new Client({
    ...connectionConfig(),
    stream: () => new Socket({ signal }),
  });
  client.on('error', () => {});
  return client;
};

const pool =
  globalThis.polycordPool ??
  new Pool({
    ...connectionConfig(),
    max: 2,
    idleTimeoutMillis: 20000,
  });
pool.on('error', () => {});

if (process.env.NODE_ENV !== 'production') {
  globalThis.polycordPool = pool;
}

export const db = drizzle(pool, { schema });

db.transaction = async (transaction, config) => {
  const client = await pool.connect();
  let failed = false;
  try {
    return await drizzle(client, { schema }).transaction(transaction, config);
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    client.release(failed);
  }
};

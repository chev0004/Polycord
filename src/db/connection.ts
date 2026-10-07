import 'server-only';

import { Socket } from 'node:net';
import { Client } from 'pg';
import supabaseCa from './supabaseCa.json';

export const connectionConfig = () => {
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
    query_timeout: 2750,
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

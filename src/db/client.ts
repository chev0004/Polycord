import 'server-only';

import { createConnection } from 'node:net';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

declare global {
  var polycordSql: postgres.Sql | undefined;
}

export const createSqlClient = (signal?: AbortSignal) => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to connect to the database.');
  }

  return postgres(databaseUrl, {
    prepare: false,
    max: signal ? 1 : 5,
    connect_timeout: 3,
    idle_timeout: 20,
    ...(signal && {
      socket: ({
        host: [host],
        port: [port],
      }: {
        host: string[];
        port: number[];
      }) =>
        new Promise<ReturnType<typeof createConnection>>((resolve, reject) => {
          const socket = createConnection({ host, port, signal });
          Object.assign(socket, { host });
          socket.once('connect', () => resolve(socket));
          socket.once('error', reject);
        }),
    }),
  });
};

const sqlClient = globalThis.polycordSql ?? createSqlClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.polycordSql = sqlClient;
}

export const db = drizzle(sqlClient, { schema });

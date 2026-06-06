import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

declare global {
  var polycordSql: postgres.Sql | undefined;
}

const createSqlClient = () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to connect to the database.');
  }

  return postgres(databaseUrl, {
    prepare: false,
  });
};

const sqlClient = globalThis.polycordSql ?? createSqlClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.polycordSql = sqlClient;
}

export const db = drizzle(sqlClient, { schema });

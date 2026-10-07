import 'server-only';

import { type ExtractTablesWithRelations, sql } from 'drizzle-orm';
import { drizzle, NodePgTransaction } from 'drizzle-orm/node-postgres';
import { PgDialect } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';
import { connectionConfig } from './connection';
import * as schema from './schema';

declare global {
  var polycordPool: Pool | undefined;
}

const pool =
  globalThis.polycordPool ??
  new Pool({
    ...connectionConfig(),
    max: 2,
    maxUses: process.env.AWS_LAMBDA_FUNCTION_NAME ? 1 : Infinity,
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

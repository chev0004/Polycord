import 'server-only';

import { AsyncLocalStorage } from 'node:async_hooks';
import { type ExtractTablesWithRelations, sql } from 'drizzle-orm';
import { drizzle, NodePgTransaction } from 'drizzle-orm/node-postgres';
import { PgDialect } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';
import { connectionConfig } from './connection';
import * as schema from './schema';

declare global {
  var polycordPool: Pool | undefined;
}

const poolOptions = () => ({
  ...connectionConfig(),
  query_timeout: 10000,
  idleTimeoutMillis: 20000,
});

const requestPools = new AsyncLocalStorage<Pool>();

class RequestPool extends Pool {
  query(...args: never[]): never {
    return Reflect.apply(
      Pool.prototype.query,
      requestPools.getStore() ?? this,
      args,
    ) as never;
  }

  connect(...args: never[]): never {
    return Reflect.apply(
      Pool.prototype.connect,
      requestPools.getStore() ?? this,
      args,
    ) as never;
  }
}

const pool =
  globalThis.polycordPool ??
  new RequestPool({
    ...poolOptions(),
    max: 2,
    maxUses: process.env.AWS_LAMBDA_FUNCTION_NAME ? 1 : Infinity,
  });
pool.on('error', () => {});

export const withRequestPool = async <T>(run: () => Promise<T>) => {
  const scoped = new Pool({ ...poolOptions(), max: 3 });
  scoped.on('error', () => {});
  for (const _ of [0, 1])
    scoped.connect().then(
      (client) => client.release(),
      () => {},
    );
  try {
    return await requestPools.run(scoped, run);
  } finally {
    void scoped.end();
  }
};

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

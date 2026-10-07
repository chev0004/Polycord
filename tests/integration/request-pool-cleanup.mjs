import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import * as pg from 'pg';
import PgPool from 'pg-pool';

let connections = 0;
class DelayedClient extends EventEmitter {
  _queryable = true;
  _ending = false;
  connect(callback) {
    connections++;
    setTimeout(() => callback(null), 40);
  }
  end(callback) {
    this._ending = true;
    setTimeout(() => {
      connections--;
      this.emit('end');
      callback?.();
    }, 40);
  }
}
class DelayedPool extends PgPool {
  constructor(options) {
    super({ ...options, Client: DelayedClient });
  }
}

process.env.DATABASE_URL = 'postgres://test@localhost/test';
process.env.AWS_LAMBDA_FUNCTION_NAME = 'request-pool-cleanup';
mock.module('server-only', () => ({}));
mock.module('pg', () => ({ ...pg, Pool: DelayedPool }));
const { scopedRoute } = await import('../../src/db/client');
const { POST } = await import('../../src/app/api/billing/webhook/route');
const response = await POST(
  new Request('http://localhost/api/billing/webhook', {
    method: 'POST',
    body: '{}',
  }),
);
assert.equal(response.status, 400);
assert.equal(connections, 0);
await assert.rejects(
  scopedRoute(async () => {
    throw new Error('early failure');
  })(),
  /early failure/,
);
assert.equal(connections, 0);
console.log('early request pool cleanup passed');

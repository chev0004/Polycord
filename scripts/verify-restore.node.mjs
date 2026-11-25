import assert from 'node:assert/strict';
import { test } from 'node:test';
import { differences } from './verify-restore.mjs';

const backup = {
  tables: { users: 3, profiles: 2 },
  migrations: ['a:1', 'b:2'],
  contents: { users: 'digest' },
  constraints: [
    {
      table: 'users',
      name: 'users_pkey',
      definition: 'PRIMARY KEY (id)',
      validated: true,
    },
  ],
};

test('an identical restore has no differences', () => {
  assert.deepEqual(differences(backup, structuredClone(backup)), []);
});

test('reports changed counts, missing tables and migration history', () => {
  assert.deepEqual(
    differences(backup, {
      ...backup,
      tables: { users: 2, reports: 0 },
      migrations: ['a'],
    }),
    [
      'users: expected 3, found 2',
      'profiles: expected 2, found no table',
      'reports: expected no table, found 0',
      'migrations: expected 2, found 1 or a different history',
    ],
  );
});

test('rejects damaged contents and constraints even when counts match', () => {
  assert.deepEqual(
    differences(backup, {
      ...backup,
      contents: { users: 'changed' },
      constraints: [],
    }),
    ['users: row contents differ', 'Public constraints differ'],
  );
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { differences } from './verify-restore.mjs';

const backup = {
  tables: { users: 3, profiles: 2 },
  migrations: ['a', 'b'],
};

test('an identical restore has no differences', () => {
  assert.deepEqual(differences(backup, structuredClone(backup)), []);
});

test('reports changed counts, missing tables and migration history', () => {
  assert.deepEqual(
    differences(backup, {
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

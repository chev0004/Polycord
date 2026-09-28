import { expect, test } from 'bun:test';
import {
  FieldValidationError,
  SessionExpiredError,
  saveResponseError,
} from './formErrors';

test('returns field issues from a rejected save', async () => {
  const issues = [{ path: ['tags'], message: 'maxTags' }];
  const error = await saveResponseError(
    Response.json({ error: 'Invalid profile', issues }, { status: 400 }),
    'Profile save failed',
  );
  expect(error).toBeInstanceOf(FieldValidationError);
  expect((error as FieldValidationError).issues).toEqual(issues);
});

test('treats an expired session separately', async () => {
  const error = await saveResponseError(
    Response.json({ error: 'Unauthorized' }, { status: 401 }),
    'Profile save failed',
  );
  expect(error).toBeInstanceOf(SessionExpiredError);
});

test('falls back when a rejected save has no field issues', async () => {
  for (const response of [
    Response.json({ error: 'Invalid JSON' }, { status: 400 }),
    new Response('not json', { status: 400 }),
    new Response(null, { status: 500 }),
  ]) {
    const error = await saveResponseError(response, 'Profile save failed');
    expect(error).not.toBeInstanceOf(FieldValidationError);
    expect(error.message).toBe('Profile save failed');
  }
});

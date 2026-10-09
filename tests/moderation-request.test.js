import { expect, test } from 'bun:test';
import { moderationSchema } from '../src/lib/moderationRequest';

const userId = '5b3f2c1e-8f4a-4a6e-9d51-2a7c3e0f1b11';
const parse = (value) => moderationSchema.safeParse({ userId, ...value });

test('a warning needs a non-blank message', () => {
  expect(parse({ action: 'warn' }).success).toBe(false);
  expect(parse({ action: 'warn', note: '' }).success).toBe(false);
  expect(parse({ action: 'warn', note: ' \n\t ' }).success).toBe(false);
});

test('a preset warning needs no message', () => {
  expect(parse({ action: 'warn', category: 'spam' }).success).toBe(true);
  expect(parse({ action: 'warn', category: 'nonsense' }).success).toBe(false);
});

test('a warning message is trimmed and capped at 500 characters', () => {
  expect(
    parse({ action: 'warn', note: `  ${'a'.repeat(500)}  ` }),
  ).toMatchObject({ success: true, data: { note: 'a'.repeat(500) } });
  expect(parse({ action: 'warn', note: 'a'.repeat(501) }).success).toBe(false);
});

test('other actions keep an optional note', () => {
  expect(parse({ action: 'hide_profile' }).success).toBe(true);
  expect(parse({ action: 'hide_profile', note: 'a'.repeat(501) }).success).toBe(
    false,
  );
});

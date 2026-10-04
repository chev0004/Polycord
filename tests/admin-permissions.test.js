import { expect, test } from 'bun:test';
import { canModerate, protectionOf } from '../src/features/Admin/permissions';

test('owners can moderate moderators and members but not owners', () => {
  expect(canModerate('owner')).toBe(true);
  expect(canModerate('owner', 'moderator')).toBe(true);
  expect(canModerate('owner', 'owner')).toBe(false);
});

test('moderators can only moderate members', () => {
  expect(canModerate('moderator')).toBe(true);
  expect(canModerate('moderator', 'moderator')).toBe(false);
  expect(canModerate('moderator', 'owner')).toBe(false);
});

test('protection names why a target cannot be actioned', () => {
  const owner = { meId: 'a', meRole: 'owner' };
  const moderator = { meId: 'b', meRole: 'moderator' };

  expect(protectionOf(owner, { id: 'a', role: 'owner' })).toBe('self');
  expect(protectionOf(moderator, { id: 'b', role: 'moderator' })).toBe('self');
  expect(protectionOf(owner, { id: 'c', role: 'owner' })).toBe('owner');
  expect(protectionOf(moderator, { id: 'a', role: 'owner' })).toBe('owner');
  expect(protectionOf(moderator, { id: 'c', role: 'moderator' })).toBe('staff');
  expect(protectionOf(owner, { id: 'c', role: 'moderator' })).toBeNull();
  expect(protectionOf(moderator, { id: 'c' })).toBeNull();
});

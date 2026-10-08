import { beforeEach, describe, expect, test } from 'bun:test';
import { discoveryCache } from './discoveryCache';
import type { DiscoveryData } from './discoveryData';

const snapshot = (total: number): DiscoveryData => ({
  profiles: [],
  total,
  page: 1,
  tags: [],
  savedProfileIds: [],
});

describe('discoveryCache', () => {
  beforeEach(() => discoveryCache.clear());

  test('keeps the newest snapshot when an older request finishes last', () => {
    const older = discoveryCache.begin('/a');
    const newer = discoveryCache.begin('/a');
    discoveryCache.set('/a', snapshot(2), newer);
    discoveryCache.set('/a', snapshot(1), older);
    expect(discoveryCache.get('/a')?.total).toBe(2);
  });

  test('accepts the latest request for each key independently', () => {
    const first = discoveryCache.begin('/a');
    const second = discoveryCache.begin('/b');
    discoveryCache.set('/a', snapshot(1), first);
    discoveryCache.set('/b', snapshot(2), second);
    expect(discoveryCache.get('/a')?.total).toBe(1);
    expect(discoveryCache.get('/b')?.total).toBe(2);
  });
});

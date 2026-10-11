import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
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

  test('drops cached pages and ignores requests started before invalidation', () => {
    const cached = discoveryCache.begin('/a');
    discoveryCache.set('/a', snapshot(1), cached);
    const inFlight = discoveryCache.begin('/b');
    discoveryCache.invalidate();
    discoveryCache.set('/b', snapshot(2), inFlight);
    expect(discoveryCache.get('/a')).toBeUndefined();
    expect(discoveryCache.get('/b')).toBeUndefined();
  });

  describe('prefetch', () => {
    const realFetch = globalThis.fetch;
    let calls: string[];

    const mockFetch = (respond: () => Response) => {
      globalThis.fetch = ((url: string) => {
        calls.push(url);
        return Promise.resolve(respond());
      }) as typeof fetch;
    };
    const ok = (total: number) => () => Response.json(snapshot(total));
    const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

    beforeEach(() => {
      calls = [];
    });
    afterEach(() => {
      globalThis.fetch = realFetch;
    });

    test('stores the page and marks it prefetched', async () => {
      mockFetch(ok(3));
      discoveryCache.prefetch('/p2');
      await settle();
      expect(discoveryCache.get('/p2')?.total).toBe(3);
      expect(discoveryCache.prefetched('/p2')).toBe(true);
    });

    test('shares one request between repeated prefetches and a waiting reader', async () => {
      mockFetch(ok(3));
      discoveryCache.prefetch('/p2');
      discoveryCache.prefetch('/p2');
      const data = await discoveryCache.pending('/p2');
      expect(data?.total).toBe(3);
      await settle();
      discoveryCache.prefetch('/p2');
      expect(calls).toEqual(['/p2']);
    });

    test('drops a page that was invalidated in flight', async () => {
      mockFetch(ok(3));
      discoveryCache.prefetch('/p2');
      discoveryCache.invalidate();
      await settle();
      expect(discoveryCache.get('/p2')).toBeUndefined();
      expect(discoveryCache.prefetched('/p2')).toBe(false);
    });

    test('discards stored and in-flight prefetches when criteria change', async () => {
      mockFetch(ok(3));
      discoveryCache.setCriteria('a');
      discoveryCache.prefetch('/p2');
      await settle();
      discoveryCache.prefetch('/p3');
      discoveryCache.setCriteria('a');
      discoveryCache.setCriteria('b');
      await settle();
      expect(discoveryCache.get('/p2')).toBeUndefined();
      expect(discoveryCache.prefetched('/p2')).toBe(false);
      expect(discoveryCache.get('/p3')).toBeUndefined();
      expect(discoveryCache.pending('/p3')).toBeUndefined();
    });

    test('ignores a failed request and allows a retry', async () => {
      mockFetch(() => new Response(null, { status: 503 }));
      discoveryCache.prefetch('/p2');
      await settle();
      expect(discoveryCache.get('/p2')).toBeUndefined();
      expect(discoveryCache.pending('/p2')).toBeUndefined();
      mockFetch(ok(3));
      discoveryCache.prefetch('/p2');
      await settle();
      expect(discoveryCache.get('/p2')?.total).toBe(3);
    });

    test('a normal fetch result is no longer treated as prefetched', async () => {
      mockFetch(ok(3));
      discoveryCache.prefetch('/p2');
      await settle();
      discoveryCache.set('/p2', snapshot(4), discoveryCache.begin('/p2'));
      expect(discoveryCache.prefetched('/p2')).toBe(false);
    });
  });
});

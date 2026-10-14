import { afterEach, beforeEach, expect, mock, spyOn, test } from 'bun:test';
import { discoveryCache } from '@/features/Discovery/discoveryCache';
import { type ProfileSheetData, profileSheetStore } from './profileSheetStore';

const data: ProfileSheetData = {
  profile: {
    id: 'target',
    displayName: 'Target',
    primaryLanguage: 'en',
    targetLanguages: [],
    tags: [],
  },
  isLoggedIn: true,
  isSaved: false,
  isOwn: false,
};
const realFetch = globalThis.fetch;

beforeEach(() => {
  profileSheetStore.invalidate();
  profileSheetStore.close();
});
afterEach(() => {
  globalThis.fetch = realFetch;
  mock.restore();
});

test('prefetch and repeated opens share one lookup and reuse its result', async () => {
  let respond!: (response: Response) => void;
  const fetch = mock(
    () =>
      new Promise<Response>((resolve) => {
        respond = resolve;
      }),
  );
  globalThis.fetch = fetch as unknown as typeof globalThis.fetch;
  profileSheetStore.prefetch('target');
  const first = profileSheetStore.load('target');
  expect(profileSheetStore.load('target')).toBe(first);
  respond(Response.json(data));
  expect(await first).toEqual(data);
  expect(await profileSheetStore.load('target')).toEqual(data);
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('switching viewers discards a cached profile and an old pending result', async () => {
  profileSheetStore.setViewer('first');
  let respond!: (response: Response) => void;
  globalThis.fetch = (() =>
    new Promise<Response>((resolve) => {
      respond = resolve;
    })) as unknown as typeof fetch;
  const pending = profileSheetStore.load('target');
  profileSheetStore.setViewer('second');
  respond(Response.json(data));
  await pending;
  expect(profileSheetStore.peek('target')).toBeNull();
  profileSheetStore.remember(data);
  profileSheetStore.setViewer('third');
  expect(profileSheetStore.peek('target')).toBeNull();
});

test('cached profiles expire and are cleared after mutations', () => {
  const now = spyOn(Date, 'now').mockReturnValue(100_000);
  profileSheetStore.remember(data);
  expect(profileSheetStore.peek('target')).toEqual(data);
  now.mockReturnValue(115_000);
  expect(profileSheetStore.peek('target')).toBeNull();
  profileSheetStore.remember(data);
  profileSheetStore.invalidate();
  expect(profileSheetStore.peek('target')).toBeNull();
});

test.each([true, false])(
  'reopening after a shared saved-state change loads isSaved=%s',
  async (isSaved) => {
    profileSheetStore.remember({ ...data, isSaved: !isSaved });
    discoveryCache.setSaved(data.profile.id, isSaved);
    const fetch = mock(() =>
      Promise.resolve(Response.json({ ...data, isSaved })),
    );
    globalThis.fetch = fetch as unknown as typeof globalThis.fetch;
    expect((await profileSheetStore.load(data.profile.id)).isSaved).toBe(
      isSaved,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  },
);

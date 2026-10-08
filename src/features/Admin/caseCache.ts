import type { ProfileCase } from './useProfileCase';

const TTL_MS = 60_000;
export const STALE_MS = 10_000;

const values = new Map<string, { value: ProfileCase; at: number }>();
const requests = new Map<string, Promise<ProfileCase>>();

export const peekCase = (profileId: string) => {
  const entry = values.get(profileId);
  const age = entry ? Date.now() - entry.at : TTL_MS;
  return entry && age < TTL_MS ? { value: entry.value, age } : null;
};

export const loadCase = (profileId: string) => {
  const inflight = requests.get(profileId);
  if (inflight) return inflight;

  const started = Date.now();
  const request = fetch(
    `/api/admin/case?profileId=${encodeURIComponent(profileId)}`,
    { cache: 'no-store' },
  )
    .then(async (response) => {
      if (!response.ok) throw new Error('Case request failed');
      const value: ProfileCase = await response.json();
      const newer = values.get(profileId);
      if (newer && newer.at > started) return newer.value;
      values.set(profileId, { value, at: Date.now() });
      return value;
    })
    .finally(() => requests.delete(profileId));
  requests.set(profileId, request);
  return request;
};

export const prefetchCase = (profileId: string) => {
  if (!peekCase(profileId)) loadCase(profileId).catch(() => {});
};

export const clearCases = () => {
  values.clear();
  requests.clear();
};

export const replaceCase = (profileId: string, value: ProfileCase) => {
  values.set(profileId, { value, at: Date.now() });
};

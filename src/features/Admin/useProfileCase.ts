'use client';

import { useCallback, useEffect, useState } from 'react';
import { loadCase, peekCase, replaceCase, STALE_MS } from './caseCache';
import type { ModData } from './types';
import type { ModerationStore } from './useModeration';

export type ProfileCase = ModData & { userId: string };

export const useProfileCase = (profileId: string) => {
  const [found, setFound] = useState<ProfileCase | null>(
    () => peekCase(profileId)?.value ?? null,
  );
  const [refreshed, setRefreshed] = useState<ProfileCase | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      setFound(await loadCase(profileId));
    } catch {
      setFailed(true);
    }
  }, [profileId]);

  useEffect(() => {
    const cached = peekCase(profileId);
    if (!cached) void load();
    else if (cached.age > STALE_MS)
      loadCase(profileId).then(setRefreshed, () => {});
  }, [profileId, load]);

  return { found, refreshed, failed, load };
};

export const useCaseSync = (
  profileId: string,
  found: ProfileCase,
  refreshed: ProfileCase | null,
  store: ModerationStore,
) => {
  const { merge, revision, users, reports, log } = store;

  useEffect(() => {
    if (refreshed && revision === 0) merge(refreshed);
  }, [refreshed, revision, merge]);

  useEffect(() => {
    if (revision > 0)
      replaceCase(profileId, { userId: found.userId, users, reports, log });
  }, [profileId, found.userId, revision, users, reports, log]);
};

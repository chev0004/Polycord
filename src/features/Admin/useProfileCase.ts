'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ModData } from './types';

export type ProfileCase = ModData & { userId: string };

export const useProfileCase = (profileId: string) => {
  const [found, setFound] = useState<ProfileCase | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const response = await fetch(
        `/api/admin/case?profileId=${encodeURIComponent(profileId)}`,
        { cache: 'no-store' },
      );
      if (!response.ok) throw new Error('Case request failed');
      setFound(await response.json());
    } catch {
      setFailed(true);
    }
  }, [profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { found, failed, load };
};

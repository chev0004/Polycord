import { useEffect, useState } from 'react';
import type { BoostResult } from './boostProfileRequest';

export const useBoostState = (boostedUntil?: string, remaining?: number) => {
  const [state, setState] = useState({ boostedUntil, remaining });
  const [now, setNow] = useState(() => Date.now());

  useEffect(
    () => setState({ boostedUntil, remaining }),
    [boostedUntil, remaining],
  );

  const end = state.boostedUntil ? new Date(state.boostedUntil).getTime() : 0;

  useEffect(() => {
    setNow(Date.now());
    const wait = end - Date.now();
    if (wait <= 0) return;
    const timer = setTimeout(() => setNow(end), wait);
    return () => clearTimeout(timer);
  }, [end]);

  return {
    active: end > now,
    boostedUntil: state.boostedUntil,
    remaining: state.remaining ?? 0,
    start: (result: BoostResult) => setState(result),
  };
};

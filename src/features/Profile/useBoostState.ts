import { useCallback, useEffect, useState } from 'react';
import { nextMonthStart } from '@/lib/boostWindow';
import { entitlementLimit } from '@/lib/entitlements';
import { type BoostResult, boostStatusRequest } from './boostProfileRequest';

export const BOOSTS_PER_MONTH = entitlementLimit(
  'discovery.monthlyBoosts',
  true,
);

export const useBoostState = (boostedUntil?: string, remaining?: number) => {
  const [state, setState] = useState({ boostedUntil, remaining });
  const [now, setNow] = useState(() => Date.now());

  useEffect(
    () => setState({ boostedUntil, remaining }),
    [boostedUntil, remaining],
  );

  const refresh = useCallback(
    () =>
      boostStatusRequest()
        .then((status) =>
          setState({
            boostedUntil: status.boostedUntil ?? undefined,
            remaining: status.remaining,
          }),
        )
        .catch(() => {}),
    [],
  );

  const end = state.boostedUntil ? new Date(state.boostedUntil).getTime() : 0;

  useEffect(() => {
    setNow(Date.now());
    const wait = end - Date.now();
    if (wait <= 0) return;
    const timer = setTimeout(() => {
      setNow(end);
      refresh();
    }, wait);
    return () => clearTimeout(timer);
  }, [end, refresh]);

  const refillAt = nextMonthStart(new Date(now)).getTime();

  useEffect(() => {
    const timer = setInterval(() => {
      const current = Date.now();
      if (current < refillAt) return;
      setNow(current);
      setState((previous) => ({ ...previous, remaining: BOOSTS_PER_MONTH }));
      refresh();
    }, 1000);
    return () => clearInterval(timer);
  }, [refillAt, refresh]);

  return {
    active: end > now,
    boostedUntil: state.boostedUntil,
    remaining: state.remaining ?? 0,
    start: (result: BoostResult) => setState(result),
  };
};

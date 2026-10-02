import { useEffect, useState } from 'react';

const CYCLE_INTERVAL = 2800;

export const useCycleIndex = (count: number, enabled = true) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!enabled || count < 2) return;
    const timer = window.setInterval(
      () => setIndex((previous) => previous + 1),
      CYCLE_INTERVAL,
    );
    return () => window.clearInterval(timer);
  }, [count, enabled]);

  return count ? index % count : 0;
};

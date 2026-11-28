import { useEffect, useState } from 'react';
import { DISCORD_CARD_CYCLE } from './types';

export const useCycleIndex = (count: number, enabled = true) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!enabled || count < 2) return;
    const timer = window.setInterval(
      () => setIndex((previous) => previous + 1),
      DISCORD_CARD_CYCLE,
    );
    return () => window.clearInterval(timer);
  }, [count, enabled]);

  return count ? index % count : 0;
};

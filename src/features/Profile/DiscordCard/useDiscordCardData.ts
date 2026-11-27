import { useEffect, useMemo, useState } from 'react';
import type { AvailabilityPattern } from '@/constants/availability';
import { formatCurrentTime } from '@/constants/languages';
import { buildDiscordCardData, ENGLISH_CARD_LABELS } from './data';

const CLOCK_INTERVAL = 30000;

const useCardClock = (timezone?: string) => {
  const [time, setTime] = useState('');

  useEffect(() => {
    if (!timezone) {
      setTime('');
      return;
    }
    const tick = () => setTime(formatCurrentTime(timezone));
    tick();
    const timer = window.setInterval(tick, CLOCK_INTERVAL);
    return () => window.clearInterval(timer);
  }, [timezone]);

  return time;
};

export const useDiscordCardData = ({
  name,
  handle,
  avatarUrl,
  primaryLanguage,
  targetLanguages,
  tags,
  availability,
  country,
  timezone,
}: {
  name: string;
  handle?: string;
  avatarUrl?: string;
  primaryLanguage: string;
  targetLanguages: { language: string; level?: string }[];
  tags: string[];
  availability?: AvailabilityPattern | null;
  country?: string;
  timezone?: string;
}) => {
  const time = useCardClock(timezone);

  return useMemo(
    () =>
      buildDiscordCardData({
        name,
        handle,
        avatarUrl,
        primaryLanguage,
        targetLanguages,
        tags,
        availability,
        country,
        time,
        locale: 'en',
        labels: ENGLISH_CARD_LABELS,
      }),
    [
      name,
      handle,
      avatarUrl,
      primaryLanguage,
      targetLanguages,
      tags,
      availability,
      country,
      time,
    ],
  );
};

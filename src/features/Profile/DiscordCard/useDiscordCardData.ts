import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import type { AvailabilityPattern } from '@/constants/availability';
import { formatCurrentTime, Proficiency } from '@/constants/languages';
import { buildDiscordCardData } from './data';

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
  const t = useTranslations('Profile');
  const tCard = useTranslations('DiscordCard');
  const locale = useLocale();
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
        locale,
        labels: {
          days: {
            any: t('availabilityDayAny'),
            weekdays: t('availabilityDayWeekdays'),
            weekends: t('availabilityDayWeekends'),
          },
          daysShort: {
            any: tCard('abbrAny'),
            weekdays: tCard('abbrWeekdays'),
            weekends: tCard('abbrWeekends'),
          },
          anyTime: t('availabilityAnyTime'),
          levels: {
            [Proficiency.BEGINNER]: t('proficiencyOptionBeginner'),
            [Proficiency.INTERMEDIATE]: t('proficiencyOptionIntermediate'),
            [Proficiency.ADVANCED]: t('proficiencyOptionAdvanced'),
            [Proficiency.NATIVE_LEVEL]: t('proficiencyOptionNativeLevel'),
          },
        },
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
      locale,
      t,
      tCard,
    ],
  );
};

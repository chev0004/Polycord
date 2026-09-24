'use client';

import { useLocale, useTranslations } from 'next-intl';
import { MdSchedule } from 'react-icons/md';
import {
  type AvailabilityPattern,
  formatAvailability,
} from '@/constants/availability';
import { useTimeFormat } from '@/features/Settings/TimeFormat';

type AvailabilityRowProps = {
  availability: AvailabilityPattern;
  ownerTimezone?: string;
  viewerTimezone?: string;
  expanded?: boolean;
};

export const AvailabilityRow = ({
  availability,
  ownerTimezone,
  viewerTimezone,
  expanded = false,
}: AvailabilityRowProps) => {
  const t = useTranslations('Discovery');
  const locale = useLocale();
  const timeFormat = useTimeFormat();

  const result = formatAvailability(
    availability,
    ownerTimezone,
    viewerTimezone,
    {
      days: {
        any: t('availabilityDayAny'),
        weekdays: t('availabilityDayWeekdays'),
        weekends: t('availabilityDayWeekends'),
      },
      anyTime: t('availabilityAnyTime'),
      to: t('availabilityTimeSeparator'),
      viewerSuffix: t('availabilityViewerSuffix'),
    },
    timeFormat,
    locale,
  );

  if (!result) return null;

  return (
    <div className="flex items-center gap-1.5 text-[12.5px] text-soft">
      <MdSchedule size={15} className="shrink-0 text-subtle" />
      <div className="flex min-w-0 flex-col gap-px overflow-hidden">
        <span
          className={`${expanded ? 'whitespace-normal break-words' : 'truncate'} text-soft`}
        >
          {result.ownerStr}
        </span>
        {result.viewerStr && (
          <span className="text-[12px] text-subtle">{result.viewerStr}</span>
        )}
      </div>
    </div>
  );
};

'use client';

import { useTranslations } from 'next-intl';
import { MdSchedule } from 'react-icons/md';
import {
  type AvailabilityPattern,
  formatAvailability,
} from '@/constants/availability';

type AvailabilityRowProps = {
  availability: AvailabilityPattern;
  ownerTimezone?: string;
  viewerTimezone?: string;
};

export const AvailabilityRow = ({
  availability,
  ownerTimezone,
  viewerTimezone,
}: AvailabilityRowProps) => {
  const t = useTranslations('Discovery');

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
  );

  if (!result) return null;

  return (
    <div className="flex items-center gap-1.5 text-[12.5px] text-gray-300">
      <MdSchedule size={15} className="shrink-0 text-gray-500" />
      <div className="flex min-w-0 flex-col gap-px overflow-hidden">
        <span className="truncate text-gray-300">{result.ownerStr}</span>
        {result.viewerStr && (
          <span className="text-[12px] text-gray-500">{result.viewerStr}</span>
        )}
      </div>
    </div>
  );
};

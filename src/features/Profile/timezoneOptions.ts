import { getTimezoneFilterOptions } from '@/features/Discovery/discoveryFilters';

export const timezoneOptions = (current?: string) => {
  const options = getTimezoneFilterOptions();
  return !current || options.some(({ value }) => value === current)
    ? options
    : [{ label: current, value: current }, ...options];
};

export const detectTimezone = () => {
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return Intl.supportedValuesOf('timeZone').includes(detected) ? detected : '';
};

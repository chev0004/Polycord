const offsetAt = (instant: number, timeZone: string) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
      .formatToParts(instant)
      .map(({ type, value }) => [type, Number(value)]),
  );
  return (
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    ) -
    Math.floor(instant / 1000) * 1000
  );
};

const startOfDay = (year: number, month: number, day: number, zone: string) => {
  const utc = Date.UTC(year, month - 1, day);
  return utc - offsetAt(utc - offsetAt(utc, zone), zone);
};

export const dayRangeIn = (timeZone: string, now = new Date()) => {
  try {
    const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .format(now)
      .split('-')
      .map(Number);
    return {
      from: new Date(startOfDay(year, month, day, timeZone)),
      to: new Date(startOfDay(year, month, day + 1, timeZone)),
    };
  } catch {
    return null;
  }
};

'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { ActionError, Spinner, useModFormat } from './ModerationParts';
import type { ActivityPage, ActivityRange } from './types';

const addDays = (day: Date, days: number) =>
  new Date(day.getFullYear(), day.getMonth(), day.getDate() + days);

const today = () => addDays(new Date(), 0);

const toInputValue = (day: Date) =>
  `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;

const fromInputValue = (value: string) => {
  const [year, month, date] = value.split('-').map(Number);
  return new Date(year, month - 1, date);
};

export const useActivityPages = <T,>(
  load: (range: ActivityRange, cursor?: string) => Promise<ActivityPage<T>>,
) => {
  const [day, setDay] = useState(today);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [page, setPage] = useState<ActivityPage<T> | null>(null);
  const [failed, setFailed] = useState(false);
  const range = useMemo(
    () => ({
      from: day.toISOString(),
      to: addDays(day, 1).toISOString(),
    }),
    [day],
  );

  useEffect(() => {
    let current = true;
    setPage(null);
    setFailed(false);
    load(range, cursors.at(-1)).then(
      (result) => current && setPage(result),
      () => current && setFailed(true),
    );
    return () => {
      current = false;
    };
  }, [load, range, cursors]);

  const chooseDay = (next: Date) => {
    setDay(next);
    setCursors([undefined]);
  };

  return {
    range,
    day,
    isToday: toInputValue(day) === toInputValue(today()),
    rows: page?.rows,
    pageNumber: cursors.length,
    hasNext: Boolean(page?.nextCursor),
    loading: !page && !failed,
    failed,
    chooseDay,
    shiftDay: (days: number) => chooseDay(addDays(day, days)),
    goToday: () => chooseDay(today()),
    retry: () => setCursors([...cursors]),
    nextPage: () =>
      page?.nextCursor && setCursors([...cursors, page.nextCursor]),
    previousPage: () => setCursors(cursors.slice(0, -1)),
  };
};

export type ActivityPages = ReturnType<typeof useActivityPages>;

const stepButton =
  'flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-background-main hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent';

export const ActivityDayBar = ({ pages }: { pages: ActivityPages }) => {
  const t = useTranslations('Admin');
  const { date } = useModFormat();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => pages.shiftDay(-1)}
        aria-label={t('previousDay')}
        className={stepButton}
      >
        <MdChevronLeft size={20} />
      </button>
      <label className="flex items-center">
        <span className="sr-only">{t('selectDate')}</span>
        <input
          type="date"
          value={toInputValue(pages.day)}
          max={toInputValue(today())}
          onChange={(event) =>
            event.target.value &&
            pages.chooseDay(fromInputValue(event.target.value))
          }
          className="h-8 rounded-full border border-white/[0.07] bg-background-darker px-3 text-foreground text-sm outline-none [color-scheme:dark] focus:border-white/[0.14]"
        />
      </label>
      <button
        type="button"
        onClick={() => pages.shiftDay(1)}
        disabled={pages.isToday}
        aria-label={t('nextDay')}
        className={stepButton}
      >
        <MdChevronRight size={20} />
      </button>
      <button
        type="button"
        onClick={pages.goToday}
        disabled={pages.isToday}
        className="h-8 rounded-full px-3 font-semibold text-primary-light text-sm hover:bg-background-main disabled:opacity-40 disabled:hover:bg-transparent"
      >
        {t('today')}
      </button>
      <span
        aria-live="polite"
        className="font-semibold text-foreground text-sm"
      >
        {pages.isToday ? `${t('today')} · ` : ''}
        {date(pages.day)}
      </span>
    </div>
  );
};

export const ActivityPager = ({ pages }: { pages: ActivityPages }) => {
  const t = useTranslations('Admin');

  return (
    <nav
      aria-label={t('pagination')}
      className="flex items-center justify-between gap-2 border-line border-t px-3.5 py-2.5"
    >
      <button
        type="button"
        onClick={pages.previousPage}
        disabled={pages.pageNumber === 1}
        className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-muted text-sm hover:bg-background-main hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <MdChevronLeft size={18} />
        {t('previousPage')}
      </button>
      <span aria-current="page" className="text-[12.5px] text-subtle">
        {t('pageNumber', { page: pages.pageNumber })}
      </span>
      <button
        type="button"
        onClick={pages.nextPage}
        disabled={!pages.hasNext}
        className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-muted text-sm hover:bg-background-main hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
      >
        {t('nextPage')}
        <MdChevronRight size={18} />
      </button>
    </nav>
  );
};

export const ActivityStatus = ({ pages }: { pages: ActivityPages }) => {
  const t = useTranslations('Admin');

  if (pages.failed) {
    return (
      <div className="p-3.5">
        <ActionError onRetry={pages.retry} />
      </div>
    );
  }

  return (
    <output className="flex items-center justify-center gap-2 px-6 py-10 text-[13px] text-subtle">
      <Spinner />
      {t('loadingActivity')}
    </output>
  );
};

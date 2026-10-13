'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { CSSProperties, ReactNode } from 'react';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';
import './style.css';

export type DayHeat = { fill: number; label: string; empty: boolean };

export type CalendarHeat = {
  tone: 'primary' | 'danger';
  of: (day: Date) => DayHeat | null;
};

const TONE_COLORS = {
  primary: 'var(--color-primary)',
  danger: 'var(--color-danger)',
};

export const monthOf = (day: Date) =>
  new Date(day.getFullYear(), day.getMonth(), 1);

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const navButton =
  'grid h-9 w-9 place-items-center rounded-full text-soft transition-colors duration-150 enabled:hover:bg-background-main enabled:hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35 max-md:h-11 max-md:w-11';

export const Calendar = ({
  view,
  onViewChange,
  selected,
  today,
  onSelect,
  onDayIntent,
  heat,
  summary,
  footer,
}: {
  view: Date;
  onViewChange: (view: Date) => void;
  selected: Date;
  today: Date;
  onSelect: (day: Date) => void;
  onDayIntent?: (day: Date) => void;
  heat?: CalendarHeat;
  summary?: ReactNode;
  footer?: ReactNode;
}) => {
  const t = useTranslations('DatePicker');
  const locale = useLocale();
  const year = view.getFullYear();
  const month = view.getMonth();
  const leading = new Date(year, month, 1).getDay();
  const length = new Date(year, month + 1, 0).getDate();
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(
      new Date(2000, 0, 2 + index),
    ),
  );
  const canGoForward = new Date(year, month + 1, 1) <= today;

  return (
    <div>
      <div className="flex items-center justify-between pb-2 pl-1">
        <span className="font-semibold text-[15px] text-foreground">
          {new Intl.DateTimeFormat(locale, {
            month: 'long',
            year: 'numeric',
          }).format(view)}
        </span>
        <div className="flex gap-0.5">
          <button
            type="button"
            aria-label={t('previousMonth')}
            onClick={() => onViewChange(new Date(year, month - 1, 1))}
            className={navButton}
          >
            <MdChevronLeft size={22} />
          </button>
          <button
            type="button"
            aria-label={t('nextMonth')}
            disabled={!canGoForward}
            onClick={() => onViewChange(new Date(year, month + 1, 1))}
            className={navButton}
          >
            <MdChevronRight size={22} />
          </button>
        </div>
      </div>
      {summary}
      <div className="grid grid-cols-7 justify-items-center gap-y-0.5">
        {weekdays.map((weekday) => (
          <span
            key={weekday}
            className="grid h-8 place-items-center font-semibold text-[11px] text-subtle uppercase tracking-[0.06em]"
          >
            {weekday}
          </span>
        ))}
        {Array.from({ length: leading }, (_, index) => (
          <span key={`blank-${index + 1}`} />
        ))}
        {Array.from({ length: length }, (_, index) => {
          const day = new Date(year, month, index + 1);
          const on = sameDay(day, selected);
          const isToday = sameDay(day, today);
          const dayHeat = day <= today ? heat?.of(day) : null;
          const tone = on
            ? heat
              ? 'bg-primary-darker font-bold text-primary-light'
              : 'bg-primary font-semibold text-on-primary'
            : isToday
              ? heat
                ? 'font-bold text-primary-light'
                : 'text-primary shadow-[inset_0_0_0_1px_var(--color-primary-dark)]'
              : dayHeat?.empty
                ? 'text-subtle enabled:hover:bg-background-main enabled:hover:text-primary-light'
                : 'text-foreground enabled:hover:bg-background-main enabled:hover:text-primary-light';

          return (
            <button
              key={day.getDate()}
              type="button"
              disabled={day > today}
              aria-pressed={on}
              aria-label={dayHeat?.label}
              onClick={() => onSelect(day)}
              onPointerEnter={() => onDayIntent?.(day)}
              onFocus={() => onDayIntent?.(day)}
              style={
                dayHeat
                  ? ({
                      '--ring-fill': dayHeat.fill,
                      '--ring-color': TONE_COLORS[heat?.tone ?? 'primary'],
                    } as CSSProperties)
                  : undefined
              }
              className={`relative grid place-items-center rounded-full text-sm tabular-nums transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-35 ${
                heat
                  ? 'h-[42px] w-[42px] max-md:h-11 max-md:w-11 max-md:text-[15px]'
                  : 'h-[38px] w-[38px] max-md:h-[46px] max-md:w-[46px] max-md:text-[15px]'
              } ${dayHeat ? 'ActivityRing' : ''} ${tone}`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
      {footer}
    </div>
  );
};

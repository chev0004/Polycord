'use client';

import * as Popover from '@radix-ui/react-popover';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { MdCalendarToday } from 'react-icons/md';
import { Button } from '@/components/Button';
import { Sheet } from '@/components/Sheet';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { Calendar, type CalendarHeat, monthOf } from './Calendar';

export type DayCounts = Record<string, number>;

export type DayActivity = {
  load: (month: Date) => Promise<DayCounts>;
  peek?: (month: Date) => DayCounts | undefined;
  prefetch?: (month: Date) => void;
  prefetchDay?: (day: Date) => void;
  tone: CalendarHeat['tone'];
  unit: (count: number) => string;
  monthLabel: string;
  legend: (cap: number) => string;
};

const MIN_FULL_RING = 5;

export const dayKey = (day: Date) =>
  `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;

const fromDayKey = (key: string) => {
  const [year, month, date] = key.split('-').map(Number);
  return new Date(year, month - 1, date);
};

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div>
    <b className="block font-bold text-[18px] text-foreground tabular-nums leading-[1.3]">
      {value}
    </b>
    <span className="text-muted text-xs">{label}</span>
  </div>
);

const Panel = ({
  selected,
  today,
  activity,
  onSelect,
  onToday,
}: {
  selected: Date;
  today: Date;
  activity?: DayActivity;
  onSelect: (day: Date) => void;
  onToday?: () => void;
}) => {
  const t = useTranslations('DatePicker');
  const locale = useLocale();
  const [view, setView] = useState(() => monthOf(selected));
  const load = activity?.load;
  const peek = activity?.peek;
  const todayTime = today.getTime();
  const prefetch = activity?.prefetch;
  const [loaded, setLoaded] = useState(() => {
    const counts = peek?.(view);
    return counts ? { month: view.getTime(), counts } : null;
  });
  const counts =
    peek?.(view) ?? (loaded?.month === view.getTime() ? loaded.counts : null);

  useEffect(() => {
    if (!load) return;
    const month = view.getTime();
    const known = peek?.(view);
    if (known) setLoaded({ month, counts: known });
    let current = true;
    load(view).then(
      (result) => current && setLoaded({ month, counts: result }),
      () => {},
    );
    for (const offset of [-1, 1]) {
      const neighbour = new Date(
        view.getFullYear(),
        view.getMonth() + offset,
        1,
      );
      if (neighbour.getTime() <= todayTime) prefetch?.(neighbour);
    }
    return () => {
      current = false;
    };
  }, [load, peek, prefetch, view, todayTime]);

  const shown = counts ?? loaded?.counts;
  const entries = Object.entries(shown ?? {});
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const busiest = entries.reduce<[string, number] | null>(
    (best, entry) => (!best || entry[1] > best[1] ? entry : best),
    null,
  );
  const cap = Math.max(MIN_FULL_RING, busiest?.[1] ?? 0);

  return (
    <Calendar
      view={view}
      onViewChange={setView}
      selected={selected}
      today={today}
      onSelect={onSelect}
      onDayIntent={activity?.prefetchDay}
      heat={
        activity
          ? {
              tone: activity.tone,
              of: (day) => {
                if (!counts) return null;
                const count = counts[dayKey(day)] ?? 0;
                return {
                  fill: count ? Math.max(0.07, Math.min(1, count / cap)) : 0,
                  empty: count === 0,
                  label: `${new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }).format(day)}, ${activity.unit(count)}`,
                };
              },
            }
          : undefined
      }
      summary={
        activity ? (
          <div
            className={`flex gap-7 px-1 pb-3.5 transition-opacity duration-150 ${shown && !counts ? 'opacity-50' : ''}`}
          >
            <Stat
              value={shown ? total.toLocaleString(locale) : '–'}
              label={activity.monthLabel}
            />
            <Stat
              value={
                busiest && busiest[1] > 0
                  ? new Intl.DateTimeFormat(locale, {
                      month: 'short',
                      day: 'numeric',
                    }).format(fromDayKey(busiest[0]))
                  : t('none')
              }
              label={`${t('busiestDay')}${busiest && busiest[1] > 0 ? ` · ${busiest[1]}` : ''}`}
            />
          </div>
        ) : null
      }
      footer={
        activity || onToday ? (
          <div className="mt-2 flex items-center justify-between gap-3 border-line border-t pt-2">
            {activity ? (
              <span className="text-muted text-xs">{activity.legend(cap)}</span>
            ) : null}
            {onToday ? (
              <button
                type="button"
                onClick={onToday}
                className="ml-auto rounded-full px-3 py-1.5 font-semibold text-[13px] text-primary-light transition-colors duration-150 hover:bg-background-main"
              >
                {t('today')}
              </button>
            ) : null}
          </div>
        ) : null
      }
    />
  );
};

export const DatePicker = ({
  value,
  onChange,
  today,
  label,
  activity,
}: {
  value: Date;
  onChange: (day: Date) => void;
  today: Date;
  label: string;
  activity?: DayActivity;
}) => {
  const t = useTranslations('DatePicker');
  const locale = useLocale();
  const mobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const warm = () => {
    const month = monthOf(value);
    for (const offset of [0, -1, 1]) {
      const neighbour = new Date(
        month.getFullYear(),
        month.getMonth() + offset,
        1,
      );
      if (neighbour <= today) activity?.prefetch?.(neighbour);
    }
  };
  const triggerClass =
    'inline-flex h-8 items-center gap-2 rounded-full border border-white/[0.07] bg-background-darker px-3 text-foreground text-sm tabular-nums transition-colors duration-150 hover:border-white/[0.14] data-[state=open]:border-white/[0.14]';
  const content = (
    <>
      <span>
        {new Intl.DateTimeFormat(locale, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(value)}
      </span>
      <MdCalendarToday size={16} aria-hidden className="text-subtle" />
    </>
  );

  if (mobile) {
    return (
      <>
        <button
          type="button"
          aria-label={label}
          onPointerEnter={warm}
          onFocus={warm}
          onClick={() => {
            setDraft(value);
            setOpen(true);
          }}
          className={triggerClass}
        >
          {content}
        </button>
        <Sheet
          open={open}
          onOpenChange={setOpen}
          title={t('selectDay')}
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="h-12 flex-1"
              >
                {t('cancel')}
              </Button>
              <Button
                weight="semibold"
                onClick={() => {
                  onChange(draft);
                  setOpen(false);
                }}
                className="h-12 flex-1"
              >
                {t('apply')}
              </Button>
            </>
          }
        >
          <Panel
            selected={draft}
            today={today}
            activity={activity}
            onSelect={setDraft}
          />
        </Sheet>
      </>
    );
  }

  const choose = (day: Date) => {
    onChange(day);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          onPointerEnter={warm}
          onFocus={warm}
          className={triggerClass}
        >
          {content}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          className={`PopoverContent z-50 rounded-list border border-line bg-background-dark p-3 font-figtree shadow-lg ${activity ? 'w-[340px]' : 'w-[296px]'}`}
        >
          <Panel
            selected={value}
            today={today}
            activity={activity}
            onSelect={choose}
            onToday={() => choose(today)}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

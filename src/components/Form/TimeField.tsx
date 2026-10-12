'use client';

import * as Popover from '@radix-ui/react-popover';
import { useLocale, useTranslations } from 'next-intl';
import { type KeyboardEvent, useCallback, useRef, useState } from 'react';
import { MdExpandMore, MdSchedule } from 'react-icons/md';
import { Button } from '@/components/Button';
import { Sheet } from '@/components/Sheet';
import type { TimeFormat } from '@/constants/languages';
import { useIsMobile } from '@/hooks/useMediaQuery';

type TimeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  format: TimeFormat;
  label: string;
  disabled?: boolean;
};

const WHEEL_ITEM = 44;

const pad = (value: number) => String(value).padStart(2, '0');
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
const to12 = (hour: number) => hour % 12 || 12;
const to24 = (hour12: number, pm: boolean) => (hour12 % 12) + (pm ? 12 : 0);

const splitTime = (value: string) => {
  const [hour, minute] = (value || '00:00').split(':').map(Number);
  return { hour, minute, pm: hour >= 12 };
};

const dayPeriods = (locale: string) =>
  [9, 21].map(
    (hour) =>
      new Intl.DateTimeFormat(locale, { hour: 'numeric', hour12: true })
        .formatToParts(new Date(2000, 0, 1, hour))
        .find((part) => part.type === 'dayPeriod')?.value ?? '',
  );

const fieldClass =
  'relative flex h-12 w-full items-center gap-2.5 rounded-field border border-line bg-background-darker px-3.5 text-[15px] text-foreground transition-[border-color,opacity] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-line-strong focus-within:border-line-strong';
const disabledClass = 'pointer-events-none cursor-not-allowed opacity-50';
const segmentClass =
  'w-[2.2ch] rounded-row bg-transparent py-[3px] text-center tabular-nums outline-none transition-colors duration-150 placeholder:text-subtle focus:bg-overlay';

const Column = ({
  title,
  options,
  selected,
  onSelect,
  width = 'w-[84px]',
}: {
  title: string;
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
  width?: string;
}) => {
  const scrollToSelected = useCallback((list: HTMLDivElement | null) => {
    const current = list?.querySelector<HTMLElement>('[aria-selected=true]');
    if (list && current) list.scrollTop = current.offsetTop - 72;
  }, []);

  return (
    <div className={width}>
      <div className="px-3 pt-1.5 pb-2 font-semibold text-[11px] text-subtle uppercase tracking-[0.06em]">
        {title}
      </div>
      <div
        ref={scrollToSelected}
        role="listbox"
        aria-label={title}
        className="relative flex h-[216px] flex-col gap-0.5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={option.value === selected}
            onClick={() => onSelect(option.value)}
            className={`flex min-h-9 shrink-0 items-center justify-center rounded-full text-sm tabular-nums transition-colors duration-150 ${
              option.value === selected
                ? 'bg-primary-darker font-semibold text-primary-light'
                : 'text-foreground hover:bg-background-main hover:text-primary-light'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const DesktopTimeField = ({
  value,
  onChange,
  format,
  label,
  disabled,
}: TimeFieldProps) => {
  const t = useTranslations('TimeField');
  const periods = dayPeriods(useLocale());
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ hour?: string; minute?: string }>({});
  const minuteInput = useRef<HTMLInputElement>(null);
  const twelve = format === '12hr';
  const { hour, minute, pm } = splitTime(value);
  const hourText = value ? (twelve ? String(to12(hour)) : pad(hour)) : '';
  const minuteText = value ? pad(minute) : '';

  const commit = (nextHour: number, nextMinute: number) =>
    onChange(`${pad(nextHour)}:${pad(nextMinute)}`);
  const setPeriod = (nextPm: boolean) =>
    commit(to24(to12(hour), nextPm), minute);
  const stepHour = (delta: number) =>
    commit(
      twelve
        ? to24(((to12(hour) - 1 + delta + 12) % 12) + 1, pm)
        : (hour + delta + 24) % 24,
      minute,
    );

  const finishHour = (text: string) => {
    setDraft((current) => ({ ...current, hour: undefined }));
    if (text === '') return;
    const typed = Number(text);
    commit(
      twelve ? to24(clamp(typed || 12, 1, 12), pm) : clamp(typed, 0, 23),
      minute,
    );
  };

  const finishMinute = (text: string) => {
    setDraft((current) => ({ ...current, minute: undefined }));
    if (text !== '') commit(hour, clamp(Number(text), 0, 59));
  };

  const onKeyDown =
    (segment: 'hour' | 'minute') =>
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') event.currentTarget.blur();
      if (twelve && /^[ap]$/i.test(event.key)) {
        event.preventDefault();
        setPeriod(event.key.toLowerCase() === 'p');
        return;
      }
      const delta = { ArrowUp: 1, ArrowDown: -1 }[event.key];
      if (!delta) return;
      event.preventDefault();
      setOpen(false);
      if (segment === 'hour') stepHour(delta);
      else commit(hour, (minute + delta + 60) % 60);
    };

  const typeInto =
    (segment: 'hour' | 'minute', limit: number) => (text: string) => {
      const digits = text.replace(/\D/g, '').slice(0, 2);
      setDraft((current) => ({ ...current, [segment]: digits }));
      setOpen(false);
      if (segment === 'hour' && (digits.length === 2 || Number(digits) > limit))
        minuteInput.current?.focus();
    };

  const hours = twelve
    ? Array.from({ length: 12 }, (_, index) => index + 1)
    : Array.from({ length: 24 }, (_, index) => index);
  const minutes = [
    ...new Set([
      ...Array.from({ length: 12 }, (_, index) => index * 5),
      minute,
    ]),
  ].sort((a, b) => a - b);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <div className={`${fieldClass} ${disabled ? disabledClass : ''}`}>
          <Popover.Trigger
            disabled={disabled}
            aria-label={label}
            className="absolute inset-0 rounded-field"
          />
          <MdSchedule size={18} aria-hidden className="shrink-0 text-subtle" />
          <input
            value={draft.hour ?? hourText}
            onChange={(event) =>
              typeInto('hour', twelve ? 1 : 2)(event.target.value)
            }
            onBlur={(event) => finishHour(event.target.value)}
            onKeyDown={onKeyDown('hour')}
            placeholder="--"
            inputMode="numeric"
            maxLength={2}
            disabled={disabled}
            aria-label={t('hour', { label })}
            className={`${segmentClass} relative`}
          />
          <span className="-mx-1 text-muted">:</span>
          <input
            ref={minuteInput}
            value={draft.minute ?? minuteText}
            onChange={(event) => typeInto('minute', 5)(event.target.value)}
            onBlur={(event) => finishMinute(event.target.value)}
            onKeyDown={onKeyDown('minute')}
            placeholder="--"
            inputMode="numeric"
            maxLength={2}
            disabled={disabled}
            aria-label={t('minute', { label })}
            className={`${segmentClass} relative`}
          />
          {twelve ? (
            <button
              type="button"
              disabled={disabled}
              onClick={(event) => {
                event.stopPropagation();
                setPeriod(!pm);
                setOpen(false);
              }}
              aria-label={t('period', { label })}
              className="relative ml-1.5 h-[30px] min-w-10 shrink-0 rounded-control bg-overlay px-2 font-semibold text-primary-light text-xs tracking-[0.04em] transition-colors duration-150 hover:bg-primary-darker"
            >
              {value ? periods[pm ? 1 : 0] : '--'}
            </button>
          ) : null}
          <MdExpandMore
            size={20}
            aria-hidden
            className={`ml-auto shrink-0 text-subtle transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          className="PopoverContent z-50 rounded-list border border-line bg-background-dark p-1.5 font-figtree shadow-lg"
        >
          <div className="flex gap-1">
            <Column
              title={t('hourColumn')}
              options={hours.map((entry) => ({
                value: String(entry),
                label: twelve ? String(entry) : pad(entry),
              }))}
              selected={String(twelve ? to12(hour) : hour)}
              onSelect={(entry) =>
                commit(twelve ? to24(Number(entry), pm) : Number(entry), minute)
              }
            />
            <Column
              title={t('minuteColumn')}
              options={minutes.map((entry) => ({
                value: String(entry),
                label: pad(entry),
              }))}
              selected={String(minute)}
              onSelect={(entry) => {
                commit(hour, Number(entry));
                if (!twelve) setOpen(false);
              }}
            />
            {twelve ? (
              <Column
                title={t('periodColumn')}
                width="w-16"
                options={periods.map((period, index) => ({
                  value: String(index),
                  label: period,
                }))}
                selected={pm ? '1' : '0'}
                onSelect={(entry) => {
                  setPeriod(entry === '1');
                  setOpen(false);
                }}
              />
            ) : null}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

const WheelColumn = ({
  items,
  index,
  onIndex,
}: {
  items: string[];
  index: number;
  onIndex: (index: number) => void;
}) => {
  const initial = useRef(index).current;
  const column = useRef<HTMLDivElement | null>(null);
  const mount = useCallback(
    (node: HTMLDivElement | null) => {
      column.current = node;
      if (node) node.scrollTop = initial * WHEEL_ITEM;
    },
    [initial],
  );

  return (
    <div
      ref={mount}
      onScroll={(event) =>
        onIndex(
          clamp(
            Math.round(event.currentTarget.scrollTop / WHEEL_ITEM),
            0,
            items.length - 1,
          ),
        )
      }
      className="relative max-w-[120px] flex-1 snap-y snap-mandatory overflow-y-auto py-[88px] [-webkit-mask-image:linear-gradient(transparent,#000_30%,#000_70%,transparent)] [mask-image:linear-gradient(transparent,#000_30%,#000_70%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {items.map((item, position) => (
        <button
          key={item}
          type="button"
          onClick={() =>
            column.current?.scrollTo({
              top: position * WHEEL_ITEM,
              behavior: 'smooth',
            })
          }
          className={`flex h-11 w-full snap-center items-center justify-center font-medium text-xl tabular-nums ${
            position === index
              ? 'font-semibold text-primary-light'
              : 'text-muted'
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
};

type WheelIndices = { hour: number; minute: number; period: number };

const MobileTimeField = ({
  value,
  onChange,
  format,
  label,
  disabled,
}: TimeFieldProps) => {
  const t = useTranslations('TimeField');
  const periods = dayPeriods(useLocale());
  const [open, setOpen] = useState(false);
  const twelve = format === '12hr';
  const { hour, minute, pm } = splitTime(value);
  const [wheel, setWheel] = useState<WheelIndices>({
    hour: 0,
    minute: 0,
    period: 0,
  });
  const display = twelve
    ? `${to12(hour)}:${pad(minute)} ${periods[pm ? 1 : 0]}`
    : `${pad(hour)}:${pad(minute)}`;

  const openSheet = () => {
    setWheel({
      hour: twelve ? to12(hour) - 1 : hour,
      minute,
      period: pm ? 1 : 0,
    });
    setOpen(true);
  };

  const apply = () => {
    onChange(
      `${pad(twelve ? to24(wheel.hour + 1, wheel.period === 1) : wheel.hour)}:${pad(wheel.minute)}`,
    );
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={openSheet}
        aria-label={label}
        className={`${fieldClass} text-left disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <MdSchedule size={18} aria-hidden className="shrink-0 text-subtle" />
        <span className="min-w-0 flex-1 whitespace-nowrap tabular-nums">
          {value ? display : twelve ? '--:-- --' : '--:--'}
        </span>
      </button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={label}
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
              variant="primary"
              weight="semibold"
              onClick={apply}
              className="h-12 flex-1"
            >
              {t('done')}
            </Button>
          </>
        }
      >
        <WheelLayout
          twelve={twelve}
          periods={periods}
          wheel={wheel}
          onChange={setWheel}
        />
      </Sheet>
    </>
  );
};

const WheelLayout = ({
  twelve,
  periods,
  wheel,
  onChange,
}: {
  twelve: boolean;
  periods: string[];
  wheel: WheelIndices;
  onChange: (wheel: WheelIndices) => void;
}) => (
  <div className="relative flex h-[220px] justify-center gap-1 before:absolute before:inset-x-0 before:top-[88px] before:h-11 before:rounded-field before:bg-primary-darker">
    <WheelColumn
      items={
        twelve
          ? Array.from({ length: 12 }, (_, index) => String(index + 1))
          : Array.from({ length: 24 }, (_, index) => pad(index))
      }
      index={wheel.hour}
      onIndex={(hour) => onChange({ ...wheel, hour })}
    />
    <div className="relative flex items-center font-semibold text-muted text-xl">
      :
    </div>
    <WheelColumn
      items={Array.from({ length: 60 }, (_, index) => pad(index))}
      index={wheel.minute}
      onIndex={(minute) => onChange({ ...wheel, minute })}
    />
    {twelve ? (
      <WheelColumn
        items={periods}
        index={wheel.period}
        onIndex={(period) => onChange({ ...wheel, period })}
      />
    ) : null}
  </div>
);

export const TimeField = (props: TimeFieldProps) =>
  useIsMobile() ? (
    <MobileTimeField {...props} />
  ) : (
    <DesktopTimeField {...props} />
  );

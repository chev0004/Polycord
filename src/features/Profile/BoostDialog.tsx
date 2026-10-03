'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { MdClose } from 'react-icons/md';
import { Button } from '@/components/Button';
import { useTimeFormat } from '@/features/Settings/TimeFormat';
import {
  BOOST_DURATION_MS,
  boostAllowance,
  monthStart,
  nextMonthStart,
} from '@/lib/boostWindow';
import { BOOSTS_PER_MONTH } from './useBoostState';

export type BoostDialogError =
  | 'boostError'
  | 'boostErrorActive'
  | 'boostErrorNone';

type BoostDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  active: boolean;
  boostedUntil?: string;
  remaining: number;
  boosting: boolean;
  error: BoostDialogError | null;
  onBoost: () => void;
};

const TILE_STYLES = {
  ready: 'bg-background-darker text-primary',
  live: 'bg-primary text-on-primary',
  used: 'text-subtle shadow-[inset_0_0_0_1px_var(--color-line-strong)]',
} as const;

const TILE_LABEL_STYLES = {
  ready: 'text-muted',
  live: 'text-on-primary',
  used: 'text-subtle',
} as const;

const TILE_LABELS = {
  ready: 'boostTileReady',
  live: 'boostTileLive',
  used: 'boostTileUsed',
} as const;

const two = (value: number) => String(value).padStart(2, '0');

const useNow = (running: boolean) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);

  return now;
};

export const BoostDialog = ({
  open,
  onOpenChange,
  active,
  boostedUntil,
  remaining,
  boosting,
  error,
  onBoost,
}: BoostDialogProps) => {
  const t = useTranslations('Profile');
  const locale = useLocale();
  const timeFormat = useTimeFormat();
  const now = useNow(open);
  const depleted = !active && remaining <= 0;
  const end = boostedUntil ? new Date(boostedUntil).getTime() : 0;
  const left = active ? Math.max(0, end - now) : 0;
  const seconds = Math.floor(left / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const allowance = boostAllowance({
    total: BOOSTS_PER_MONTH,
    remaining,
    boostedUntil: end,
    now,
  });
  const tiles = (['used', 'live', 'ready'] as const)
    .flatMap((kind) => Array<typeof kind>(allowance[kind]).fill(kind))
    .map((kind, index) => ({ kind, number: index + 1 }));
  const cycleStart = monthStart(new Date(now)).getTime();
  const refillAt = nextMonthStart(new Date(now)).getTime();
  const refillDays = Math.floor((refillAt - now) / 86400000);
  const endsToday =
    new Date(end).toDateString() === new Date(now).toDateString();
  const endTime = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: timeFormat === '12hr' ? 'h12' : 'h23',
  }).format(end);
  const refillDate = new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'short',
  }).format(refillAt);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content
            className="DialogContent pointer-events-auto flex max-h-[calc(100dvh-2rem)] w-[min(440px,calc(100vw-2rem))] flex-col gap-[22px] overflow-y-auto rounded-panel border border-line bg-background-dark p-6 shadow-xl"
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <div className="flex items-center gap-3">
              <Dialog.Title className="min-w-0 flex-1 font-figtree font-semibold text-[19px] text-foreground leading-[1.2]">
                {t('boostProfile')}
              </Dialog.Title>
              <Dialog.Close
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-background-darker text-soft transition-colors hover:bg-primary-darker hover:text-foreground focus-visible:bg-primary-darker focus-visible:text-foreground"
                aria-label={t('boostClose')}
              >
                <MdClose size={20} />
              </Dialog.Close>
            </div>

            {active ? (
              <div className="flex flex-col gap-[18px] rounded-2xl bg-background-darker px-5 pt-[18px] pb-5">
                <div className="flex items-center justify-between gap-3">
                  <Dialog.Description className="font-semibold text-[11px] text-subtle uppercase tracking-[0.06em]">
                    {t('boostActive')}
                  </Dialog.Description>
                  <span className="whitespace-nowrap text-right text-[12.5px] text-muted">
                    {t(endsToday ? 'boostEndsToday' : 'boostEndsTomorrow', {
                      time: endTime,
                    })}
                  </span>
                </div>
                <div
                  role="timer"
                  aria-label={t('boostClockLabel', { hours, minutes })}
                  className="flex items-start gap-2.5 tabular-nums"
                >
                  {(
                    [
                      [hours, 'boostUnitHours'],
                      [minutes, 'boostUnitMinutes'],
                      [seconds % 60, 'boostUnitSeconds'],
                    ] as const
                  ).map(([value, unit], index) => (
                    <div key={unit} className="flex items-start gap-2.5">
                      {index ? (
                        <span
                          aria-hidden="true"
                          className="font-light text-[46px] text-primary-dark leading-none"
                        >
                          :
                        </span>
                      ) : null}
                      <div className="flex min-w-16 flex-col gap-1.5">
                        <span className="font-bold text-[46px] text-foreground leading-none tracking-[-0.02em]">
                          {two(value)}
                        </span>
                        <span className="font-semibold text-[10.5px] text-subtle uppercase tracking-[0.08em]">
                          {t(unit)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-background-dark">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
                    style={{
                      width: `${Math.min(100, (left / BOOST_DURATION_MS) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <Dialog.Description className="font-light text-[14px] text-muted leading-[1.55]">
                {t('boostLead')}
              </Dialog.Description>
            )}

            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold text-[11px] text-subtle uppercase tracking-[0.06em]">
                  {t('boostAllowanceHeading')}
                </span>
                <span className="text-[13px] text-muted">
                  {t.rich('boostAllowanceCount', {
                    left: allowance.ready,
                    total: BOOSTS_PER_MONTH,
                    b: (chunks) => (
                      <b className="font-bold text-foreground">{chunks}</b>
                    ),
                  })}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {tiles.map(({ kind, number }) => (
                  <div
                    key={number}
                    className={`flex h-[68px] flex-col items-center justify-center gap-[5px] rounded-xl ${TILE_STYLES[kind]}`}
                  >
                    <b className="font-bold text-2xl leading-none">{number}</b>
                    <span
                      className={`font-bold text-[10.5px] uppercase tracking-[0.08em] ${TILE_LABEL_STYLES[kind]}`}
                    >
                      {t(TILE_LABELS[kind])}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-0.5 flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-3 text-[13px] text-muted">
                  <span>
                    {t.rich('boostRefillTo', {
                      count: BOOSTS_PER_MONTH,
                      date: refillDate,
                      b: (chunks) => (
                        <b className="font-medium text-foreground">{chunks}</b>
                      ),
                    })}
                  </span>
                  <span className="whitespace-nowrap text-subtle">
                    {refillDays >= 1
                      ? t('boostRefillDays', { count: refillDays })
                      : t('boostRefillHours', {
                          count: Math.max(
                            1,
                            Math.floor((refillAt - now) / 3600000),
                          ),
                        })}
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-background-darker">
                  <div
                    className="h-full rounded-full bg-primary-dark"
                    style={{
                      width: `${((now - cycleStart) / (refillAt - cycleStart)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-md border border-red-800 bg-danger-surface px-3.5 py-3 text-[14px] text-danger"
              >
                {t(error)}
              </div>
            ) : null}

            <div className="flex flex-col gap-2.5">
              <Button
                weight="semibold"
                onClick={onBoost}
                disabled={active || depleted || boosting}
                className="h-12 w-full text-[15px] disabled:bg-background-darker disabled:text-subtle disabled:opacity-100"
              >
                {active
                  ? t('boostRunning')
                  : depleted
                    ? t('boostNoneLeft')
                    : t('boostNow')}
              </Button>
              <p className="text-center text-[12px] text-subtle">
                {active
                  ? t('boostFineRunning')
                  : depleted
                    ? t('boostFineDepleted')
                    : t('boostFineAvailable', { count: remaining })}
              </p>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { MdStorage } from 'react-icons/md';
import { SEED_PRESETS } from '@/lib/seed/limits';
import {
  ActionError,
  durationTile,
  modButton,
  Spinner,
} from './ModerationParts';
import type { SeedStatus } from './types';

type Run = { start: number; target: number };

const requestStep = async (target: number): Promise<SeedStatus> => {
  const response = await fetch('/api/admin/seed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target }),
  });
  if (!response.ok) throw new Error('Seed step failed');
  return response.json();
};

export const SeedPanel = ({
  initial,
  mobile = false,
}: {
  initial: SeedStatus;
  mobile?: boolean;
}) => {
  const t = useTranslations('Admin');
  const number = new Intl.NumberFormat(useLocale());
  const [status, setStatus] = useState(initial);
  const [target, setTarget] = useState(String(initial.dummies));
  const [run, setRun] = useState<Run | null>(null);
  const [failed, setFailed] = useState<number | null>(null);
  const parsed = Number(target);
  const valid =
    target.trim() !== '' &&
    Number.isInteger(parsed) &&
    parsed >= 0 &&
    parsed <= status.cap;

  const apply = async (goal: number) => {
    setFailed(null);
    setTarget(String(goal));
    setRun({ start: status.dummies, target: goal });
    let current = status;
    try {
      while (current.dummies !== goal) {
        const next = await requestStep(goal);
        if (next.dummies === current.dummies) throw new Error('No progress');
        current = next;
        setStatus(next);
      }
    } catch {
      setFailed(goal);
    } finally {
      setRun(null);
    }
  };

  const done = run ? Math.abs(status.dummies - run.start) : 0;
  const total = run ? Math.abs(run.target - run.start) : 0;

  return (
    <section
      aria-label={t('seedTitle')}
      className={`flex flex-col gap-5 bg-background-dark ${mobile ? 'mx-4 rounded-3xl p-[18px]' : 'max-w-[720px] rounded-3xl p-6 shadow-xl'}`}
    >
      <div className="flex flex-col gap-2">
        <h2 className="font-bold text-foreground text-lg">{t('seedTitle')}</h2>
        <p className="text-[13.5px] text-muted leading-normal">
          {t('seedIntro')}
        </p>
        <p className="inline-flex items-center gap-2 self-start rounded-full bg-background-darker px-3 py-1.5 font-medium text-[12.5px] text-soft">
          <MdStorage size={16} className="text-primary" />
          {t('seedDatabase', { label: status.label })}
        </p>
        {status.shared ? (
          <p className="text-[12.5px] text-discord-yellow leading-normal">
            {t('seedShared')}
          </p>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-3">
        {(
          [
            ['seedReal', status.real],
            ['seedDummies', status.dummies],
          ] as const
        ).map(([key, value]) => (
          <div key={key} className="rounded-2xl bg-background-darker p-4">
            <dt className="font-semibold text-[11px] text-subtle uppercase tracking-[0.06em]">
              {t(key)}
            </dt>
            <dd className="mt-1 font-bold text-2xl text-foreground tabular-nums">
              {number.format(value)}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-2.5">
        <label
          htmlFor="seed-target"
          className="font-semibold text-[11px] text-subtle uppercase tracking-[0.06em]"
        >
          {t('seedTarget')}
        </label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {SEED_PRESETS.filter((preset) => preset <= status.cap).map(
            (preset) => (
              <button
                key={preset}
                type="button"
                disabled={Boolean(run)}
                onClick={() => setTarget(String(preset))}
                className={`${durationTile(parsed === preset)} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                {number.format(preset)}
              </button>
            ),
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="seed-target"
            type="number"
            inputMode="numeric"
            min={0}
            max={status.cap}
            step={1}
            value={target}
            disabled={Boolean(run)}
            onChange={(event) => setTarget(event.target.value)}
            className="h-[34px] w-36 rounded-lg border border-white/[0.07] bg-background-darker px-3 text-[13px] text-foreground tabular-nums outline-none hover:border-white/[0.14] focus:border-white/[0.14] disabled:opacity-40"
          />
          <button
            type="button"
            disabled={Boolean(run) || !valid || parsed === status.dummies}
            onClick={() => apply(parsed)}
            className={modButton('primary')}
          >
            {t('seedApply')}
          </button>
          <button
            type="button"
            disabled={Boolean(run) || status.dummies === 0}
            onClick={() => apply(0)}
            className={modButton('danger')}
          >
            {t('seedRemoveAll')}
          </button>
          <span className="text-[12px] text-subtle">
            {t('seedCap', { cap: number.format(status.cap) })}
          </span>
        </div>
      </div>

      {run ? (
        <output className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-2 text-[13px] text-soft">
            <Spinner />
            {t(run.target > run.start ? 'seedAdding' : 'seedRemoving', {
              done: number.format(done),
              total: number.format(total),
            })}
          </span>
          <progress
            max={total}
            value={done}
            aria-label={t('seedTitle')}
            className="h-2 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-background-darker [&::-webkit-progress-value]:bg-primary"
          />
        </output>
      ) : null}

      {failed !== null ? (
        <ActionError mobile={mobile} onRetry={() => apply(failed)} />
      ) : null}
    </section>
  );
};

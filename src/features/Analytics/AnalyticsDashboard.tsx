'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { ACTIVATION_FUNNEL } from '@/lib/analytics/events';

const DAILY_CHART_HEIGHT = 152;

const EVENT_LABEL_KEYS: Record<string, string> = {
  'auth.signup': 'eventAuthSignup',
  'auth.login': 'eventAuthLogin',
  'onboarding.start': 'eventOnboardingStart',
  'onboarding.complete': 'eventOnboardingComplete',
  'profile.save': 'eventProfileSave',
  'profile.bump': 'eventProfileBump',
  'discovery.view': 'eventDiscoveryView',
  'profile.view': 'eventProfileView',
  'profile.username_copy': 'eventUsernameCopy',
  'profile.save_favorite': 'eventSaveFavorite',
  'connection.intro_request': 'eventIntroRequest',
  'safety.report': 'eventReport',
  'safety.block': 'eventBlock',
  'premium.upgrade': 'eventPremiumUpgrade',
};

export type AnalyticsDashboardProps = {
  locale: string;
  rangeDays: number;
  dailyDays: number;
  totals: { totalEvents: number; uniqueUsers: number };
  eventCounts: { name: string; total: number }[];
  daily: { date: string; total: number }[];
  recent: {
    id: string;
    name: string;
    userId: string | null;
    locale: string | null;
    metadata: unknown;
    createdAt: string;
  }[];
};

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-1 rounded-2xl bg-background-dark p-5 shadow-xl">
    <span className="text-[12.5px] text-subtle uppercase tracking-[0.05em]">
      {label}
    </span>
    <span className="font-bold font-figtree text-[28px] text-foreground leading-none">
      {value}
    </span>
  </div>
);

export const AnalyticsDashboard = ({
  locale,
  rangeDays,
  dailyDays,
  totals,
  eventCounts,
  daily,
  recent,
}: AnalyticsDashboardProps) => {
  const t = useTranslations('Analytics');

  const formatNumber = (value: number) => value.toLocaleString(locale);
  const eventLabel = (name: string) => {
    const key = EVENT_LABEL_KEYS[name];
    return key ? t(key) : name;
  };

  const countByName = useMemo(
    () => new Map(eventCounts.map((event) => [event.name, event.total])),
    [eventCounts],
  );

  const funnel = useMemo(
    () =>
      ACTIVATION_FUNNEL.map((name) => ({
        name,
        total: countByName.get(name) ?? 0,
      })),
    [countByName],
  );

  const funnelTop = funnel[0]?.total ?? 0;
  const maxEventCount = Math.max(...eventCounts.map((e) => e.total), 1);

  const days = useMemo(() => {
    const dailyMap = new Map(daily.map((entry) => [entry.date, entry.total]));
    return Array.from({ length: dailyDays }, (_, index) => {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - (dailyDays - 1 - index));
      const key = date.toISOString().slice(0, 10);
      return { date: key, total: dailyMap.get(key) ?? 0 };
    });
  }, [daily, dailyDays]);

  const maxDaily = Math.max(...days.map((day) => day.total), 1);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="mx-auto w-full max-w-[1140px] px-6 pt-8 pb-24">
      <div className="mb-6">
        <h1 className="font-bold font-figtree text-[30px] text-foreground leading-[1.1]">
          {t('title')}
        </h1>
        <p className="mt-1.5 font-light text-[15px] text-muted">
          {t('subtitle', { days: rangeDays })}
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label={t('totalEvents')}
          value={formatNumber(totals.totalEvents)}
        />
        <StatCard
          label={t('uniqueUsers')}
          value={formatNumber(totals.uniqueUsers)}
        />
        <StatCard
          label={t('eventTypes')}
          value={formatNumber(eventCounts.length)}
        />
      </div>

      {totals.totalEvents === 0 ? (
        <div className="rounded-3xl bg-background-dark p-10 text-center shadow-xl">
          <p className="font-semibold text-[17px] text-foreground">
            {t('emptyTitle')}
          </p>
          <p className="mt-1 text-[14px] text-subtle">
            {t('emptyDescription')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <section className="rounded-3xl bg-background-dark p-6 shadow-xl">
            <h2 className="mb-1 font-figtree font-semibold text-[19px] text-primary">
              {t('funnelTitle')}
            </h2>
            <p className="mb-4 text-[13px] text-subtle">
              {t('funnelDescription')}
            </p>
            <div className="flex flex-col gap-3">
              {funnel.map((step) => {
                const share = funnelTop > 0 ? step.total / funnelTop : 0;
                return (
                  <div key={step.name} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-soft">{eventLabel(step.name)}</span>
                      <span className="text-muted tabular-nums">
                        {formatNumber(step.total)}
                        <span className="ml-2 text-subtle">
                          {`${Math.round(share * 100)}%`}
                        </span>
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-background-darker">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(share * 100, 1.5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl bg-background-dark p-6 shadow-xl">
            <h2 className="mb-1 font-figtree font-semibold text-[19px] text-primary">
              {t('dailyTitle', { days: dailyDays })}
            </h2>
            <div className="mt-4">
              <div
                className="flex items-end gap-1.5"
                style={{ height: `${DAILY_CHART_HEIGHT}px` }}
              >
                {days.map((day) => (
                  <div
                    key={day.date}
                    className="flex-1 rounded-t-md bg-primary"
                    style={{
                      height: `${Math.max(
                        Math.round((day.total / maxDaily) * DAILY_CHART_HEIGHT),
                        3,
                      )}px`,
                    }}
                    title={`${day.date}: ${day.total}`}
                  />
                ))}
              </div>
              <div className="mt-1.5 flex gap-1.5">
                {days.map((day) => (
                  <span
                    key={day.date}
                    className="flex-1 text-center text-[10px] text-subtle tabular-nums"
                  >
                    {day.date.slice(8)}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-background-dark p-6 shadow-xl">
            <h2 className="mb-4 font-figtree font-semibold text-[19px] text-primary">
              {t('eventVolumeTitle')}
            </h2>
            <div className="flex flex-col gap-2.5">
              {eventCounts.map((event) => (
                <div key={event.name} className="flex items-center gap-3">
                  <span className="w-44 shrink-0 truncate text-[13px] text-soft">
                    {eventLabel(event.name)}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-background-darker">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${(event.total / maxEventCount) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right text-[13px] text-muted tabular-nums">
                    {formatNumber(event.total)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl bg-background-dark p-6 shadow-xl">
            <h2 className="mb-4 font-figtree font-semibold text-[19px] text-primary">
              {t('recentTitle')}
            </h2>
            <div className="flex flex-col divide-y divide-line">
              {recent.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 py-2.5 text-[13px]"
                >
                  <span className="min-w-0 flex-1 truncate text-soft">
                    {eventLabel(event.name)}
                  </span>
                  <span className="shrink-0 rounded-full bg-overlay px-2 py-0.5 text-[11px] text-muted">
                    {event.userId
                      ? t('audienceAuthenticated')
                      : t('audienceAnonymous')}
                  </span>
                  <span className="w-10 shrink-0 text-center text-subtle uppercase">
                    {event.locale ?? '—'}
                  </span>
                  <span className="w-32 shrink-0 text-right text-subtle tabular-nums">
                    {formatTime(event.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

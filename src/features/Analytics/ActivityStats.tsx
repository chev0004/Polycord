'use client';

import { useTranslations } from 'next-intl';
import { MdLock } from 'react-icons/md';
import { Button } from '@/components/Button';

export type ActivityStatsProps = {
  locale: string;
  rangeDays: number;
  analyticsEnabled: boolean;
  premium: boolean;
  stats: {
    profilesViewed: number;
    usernamesCopied: number;
    profilesSaved: number;
    profileBumps: number;
  };
  onEnableAnalytics: () => void;
  onUpgrade: () => void;
};

const StatCard = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) => (
  <div className="flex flex-col gap-1 rounded-2xl bg-background-dark p-5 shadow-xl">
    <span className="text-[12.5px] text-gray-500 uppercase tracking-[0.05em]">
      {label}
    </span>
    <span className="font-bold font-figtree text-[28px] text-white leading-none">
      {value}
    </span>
    <span className="mt-1 text-[12px] text-gray-500">{hint}</span>
  </div>
);

export const ActivityStats = ({
  locale,
  rangeDays,
  analyticsEnabled,
  premium,
  stats,
  onEnableAnalytics,
  onUpgrade,
}: ActivityStatsProps) => {
  const t = useTranslations('Activity');
  const formatNumber = (value: number) => value.toLocaleString(locale);

  return (
    <div className="mx-auto w-full max-w-[1140px] px-6 pt-8 pb-24">
      <div className="mb-6">
        <h1 className="font-bold font-figtree text-[30px] text-white leading-[1.1]">
          {t('title')}
        </h1>
        <p className="mt-1.5 font-light text-[15px] text-gray-400">
          {t('subtitle', { days: rangeDays })}
        </p>
      </div>

      {analyticsEnabled ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={t('profilesViewedLabel')}
            value={formatNumber(stats.profilesViewed)}
            hint={t('profilesViewedHint')}
          />
          <StatCard
            label={t('usernamesCopiedLabel')}
            value={formatNumber(stats.usernamesCopied)}
            hint={t('usernamesCopiedHint')}
          />
          <StatCard
            label={t('profilesSavedLabel')}
            value={formatNumber(stats.profilesSaved)}
            hint={t('profilesSavedHint')}
          />
          <StatCard
            label={t('profileBumpsLabel')}
            value={formatNumber(stats.profileBumps)}
            hint={t('profileBumpsHint')}
          />
        </div>
      ) : (
        <div className="rounded-3xl bg-background-dark p-8 text-center shadow-xl">
          <p className="font-semibold text-[17px] text-white">
            {t('disabledTitle')}
          </p>
          <p className="mx-auto mt-1.5 max-w-[440px] text-[14px] text-gray-500 leading-relaxed">
            {t('disabledDescription')}
          </p>
          <Button onClick={onEnableAnalytics} className="mt-5 h-10">
            {t('enableButton')}
          </Button>
        </div>
      )}

      {premium ? null : (
        <section className="mt-6 flex flex-col gap-4 rounded-3xl bg-background-dark p-6 shadow-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-figtree font-semibold text-[19px] text-primary">
              <MdLock size={18} className="text-gray-400" />
              {t('premiumTitle')}
            </p>
            <p className="mt-1 text-[13px] text-gray-500 leading-relaxed">
              {t('premiumDescription')}
            </p>
          </div>
          <Button
            onClick={onUpgrade}
            className="h-10 shrink-0 whitespace-nowrap"
          >
            {t('premiumUpgradeButton')}
          </Button>
        </section>
      )}
    </div>
  );
};

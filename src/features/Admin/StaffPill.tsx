'use client';

import { useTranslations } from 'next-intl';
import { MdAdminPanelSettings } from 'react-icons/md';

export const StaffPill = () => {
  const t = useTranslations('Admin');
  return (
    <span className="ml-1 inline-flex h-6 shrink-0 items-center gap-[5px] whitespace-nowrap rounded-full bg-primary-darker px-1.5 font-bold font-figtree text-[11px] text-primary-light uppercase tracking-[0.06em] sm:ml-3 sm:px-2.5">
      <MdAdminPanelSettings size={14} className="text-primary" />
      <span className="max-sm:sr-only">{t('staffPill')}</span>
    </span>
  );
};

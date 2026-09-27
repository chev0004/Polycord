'use client';

import { useTranslations } from 'next-intl';

export const DummyChip = ({ className = '' }: { className?: string }) => {
  const t = useTranslations('Discovery');

  return (
    <span
      className={`inline-flex h-6 items-center rounded-full border border-line-strong border-dashed px-2.5 font-semibold text-[11px] text-muted uppercase tracking-wide ${className}`}
    >
      {t('dummyChip')}
    </span>
  );
};

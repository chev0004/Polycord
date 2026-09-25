'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

export const MemberEmptyState = ({
  kind,
}: {
  kind: 'blocked' | 'notFound';
}) => {
  const t = useTranslations('PublicProfile');
  const locale = useLocale();

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-3 rounded-2xl border border-primary-dark border-dashed bg-background-darker px-6 py-12 text-center">
      <span className="rounded-full bg-primary-darker px-3 py-1 font-semibold text-primary text-xs uppercase tracking-wide">
        {t(`${kind}Badge`)}
      </span>
      <h1 className="font-figtree font-semibold text-2xl text-foreground">
        {t(`${kind}Title`)}
      </h1>
      <p className="max-w-[440px] text-muted text-sm">
        {t(`${kind}Description`)}
      </p>
      <Link
        href={`/${locale}`}
        className="mt-2 rounded-lg border border-primary-dark px-4 py-2 font-figtree text-primary-light text-sm transition-colors hover:bg-primary-darker focus:outline-none focus-visible:bg-primary-darker"
      >
        {t('backToDiscover')}
      </Link>
    </div>
  );
};

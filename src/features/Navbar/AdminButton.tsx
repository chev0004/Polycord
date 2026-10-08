'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { MdOutlineShield } from 'react-icons/md';
import { useRouteProgress } from '@/features/Navigation/RouteProgress';

export const AdminButton = ({ pendingCases }: { pendingCases: number }) => {
  const t = useTranslations('Admin');
  const locale = useLocale();
  const { start } = useRouteProgress();
  const href = `/${locale}/admin`;

  return (
    <Link
      href={href}
      onNavigate={() => start(href)}
      aria-label={t('adminButtonLabel', { count: pendingCases })}
      className="flex h-9 select-none items-center gap-2 rounded-lg px-1 font-figtree font-semibold text-foreground text-sm outline-none transition-colors duration-200 hover:text-muted focus-visible:bg-primary-dark max-md:h-11 max-md:w-11 max-md:justify-center"
    >
      <span className="relative flex">
        <MdOutlineShield size={24} />
        {pendingCases > 0 ? (
          <span className="-top-[5px] -right-1.5 absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-discord-blue px-1 font-bold text-[11px] text-foreground ring-2 ring-background-main md:ring-background-darker">
            {pendingCases}
          </span>
        ) : null}
      </span>
      <span aria-hidden className="max-md:hidden">
        {t('adminButton')}
      </span>
    </Link>
  );
};

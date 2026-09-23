'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { type ReactNode, useState } from 'react';
import { useRouteProgressRouter } from '@/features/Navigation/RouteProgress';
import { localizePath } from '@/utils/localePaths';
import type { locales } from '@/utils/locales';

export const LocaleLink = ({
  locale,
  className,
  children,
}: {
  locale: (typeof locales)[number];
  className: string;
  children: ReactNode;
}) => {
  const currentLocale = useLocale();
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const href = `${localizePath(pathname, locale)}${query ? `?${query}` : ''}`;
  const router = useRouteProgressRouter();
  const t = useTranslations('LanguageSwitcher');
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');

  return (
    <div>
      <Link
        href={href}
        aria-current={locale === currentLocale ? 'true' : undefined}
        aria-disabled={status === 'saving'}
        className={className}
        onClick={async (event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
            return;
          event.preventDefault();
          if (locale === currentLocale || status === 'saving') return;
          setStatus('saving');
          try {
            const response = await fetch('/api/settings', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ applicationLanguage: locale }),
            });
            if (!response.ok) throw new Error('Locale save failed');
            router.push(`${href}${window.location.hash}`);
            router.refresh();
            setStatus('idle');
          } catch {
            setStatus('error');
          }
        }}
      >
        {children}
      </Link>
      {status === 'error' ? (
        <p role="alert" className="py-2 text-danger text-xs">
          {t('saveError')}
        </p>
      ) : null}
    </div>
  );
};

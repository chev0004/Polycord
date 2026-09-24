'use client';

import { useLocale, useTranslations } from 'next-intl';
import { MdArrowBack } from 'react-icons/md';
import { isLocale, localizePath } from '@/utils/localePaths';
import { useRouteProgressRouter } from './RouteProgress';

export const DISCOVERY_RETURN_KEY = 'polycord:discovery-return';

export const ReturnLink = () => {
  const t = useTranslations('Navigation');
  const locale = useLocale();
  const router = useRouteProgressRouter();

  const goBack = () => {
    let href = `/${locale}`;
    try {
      const stored = sessionStorage.getItem(DISCOVERY_RETURN_KEY);
      if (stored && isLocale(locale))
        href = localizePath(JSON.parse(stored).href, locale);
    } catch {}
    router.push(href);
  };

  return (
    <button
      type="button"
      onClick={goBack}
      className="mb-5 inline-flex items-center gap-1.5 py-2 text-muted text-sm hover:text-foreground focus-visible:text-foreground"
    >
      <MdArrowBack size={18} />
      {t('backToDiscovery')}
    </button>
  );
};

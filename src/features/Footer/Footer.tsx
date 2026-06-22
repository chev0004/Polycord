'use client';

import { useTranslations } from 'next-intl';
import { useRouteProgressRouter } from '@/features/Navigation/RouteProgress';

type FooterProps = {
  locale: string;
};

export const Footer: React.FC<FooterProps> = ({ locale }) => {
  const t = useTranslations('Footer');
  const tLegal = useTranslations('Legal');
  const router = useRouteProgressRouter();
  const year = new Date().getFullYear();

  const legalLinks: { id: string; label: string; href: string }[] = [
    {
      id: 'terms',
      label: tLegal('termsTitle'),
      href: `/${locale}/legal/terms`,
    },
    {
      id: 'privacy',
      label: tLegal('privacyTitle'),
      href: `/${locale}/legal/privacy`,
    },
    {
      id: 'guidelines',
      label: tLegal('guidelinesTitle'),
      href: `/${locale}/legal/guidelines`,
    },
  ];

  return (
    <footer className="w-full border-background-darker border-t bg-background-darker/40 font-figtree">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <p className="font-black font-figtree text-[22px] text-white tracking-[-0.01em]">
            {t('brand')}
          </p>
          <p className="mt-2 text-gray-400 text-sm leading-relaxed">
            {t('tagline')}
          </p>
        </div>

        <nav className="flex flex-col gap-3" aria-label={t('legalHeading')}>
          <span className="font-semibold text-[13px] text-gray-300 uppercase tracking-wide">
            {t('legalHeading')}
          </span>
          {legalLinks.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => router.push(link.href)}
              className="text-left text-gray-400 text-sm transition-colors hover:text-white"
            >
              {link.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-8">
        <p className="text-gray-500 text-xs">{t('copyright', { year })}</p>
      </div>
    </footer>
  );
};

'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouteProgress } from '@/features/Navigation/RouteProgress';
import { locales } from '@/utils/locales';

type FooterProps = {
  locale: string;
};

const localeNames: Record<string, string> = {
  en: 'English',
  ja: '日本語',
};

type FooterLinkProps = {
  href: string;
  isCurrent?: boolean;
  children: React.ReactNode;
};

const FooterLink = ({ href, isCurrent, children }: FooterLinkProps) => {
  const { start } = useRouteProgress();
  const pathname = usePathname();

  return (
    <Link
      href={href}
      aria-current={isCurrent ? 'true' : undefined}
      onClick={() => {
        if (pathname !== href) {
          start();
        }
      }}
      className={`w-fit text-sm no-underline transition-colors focus-visible:text-white focus-visible:underline ${
        isCurrent ? 'text-primary-light' : 'text-gray-400 hover:text-white'
      }`}
    >
      {children}
    </Link>
  );
};

const FooterHeading = ({ children }: { children: React.ReactNode }) => (
  <span className="font-semibold text-[12px] text-gray-500 uppercase tracking-[0.08em]">
    {children}
  </span>
);

export const Footer: React.FC<FooterProps> = ({ locale }) => {
  const t = useTranslations('Footer');
  const tLegal = useTranslations('Legal');
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const year = new Date().getFullYear();

  const pathWithoutLocale = pathname.replace(/^\/[^/]+/, '');
  const query = searchParams.toString();
  const queryString = query ? `?${query}` : '';

  const exploreLinks: { id: string; label: string; href: string }[] = [
    { id: 'home', label: t('homeLink'), href: `/${locale}` },
    { id: 'saved', label: t('savedLink'), href: `/${locale}/saved` },
    { id: 'settings', label: t('settingsLink'), href: `/${locale}/settings` },
  ];

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
    <footer className="w-full border-primary-darker border-t bg-background-darkest font-figtree">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-12 sm:px-8 md:flex-row md:justify-between md:gap-16">
        <div className="max-w-sm">
          <p className="font-black text-[22px] text-white tracking-[-0.01em]">
            {t('brand')}
          </p>
          <p className="mt-2 text-gray-400 text-sm leading-relaxed">
            {t('tagline')}
          </p>
          <p className="mt-4 text-gray-500 text-xs leading-relaxed">
            {t('safetyNote')}
          </p>
        </div>

        <div className="flex flex-wrap gap-x-16 gap-y-10">
          <nav className="flex flex-col gap-3" aria-label={t('exploreHeading')}>
            <FooterHeading>{t('exploreHeading')}</FooterHeading>
            {exploreLinks.map((link) => (
              <FooterLink key={link.id} href={link.href}>
                {link.label}
              </FooterLink>
            ))}
          </nav>

          <nav className="flex flex-col gap-3" aria-label={t('legalHeading')}>
            <FooterHeading>{t('legalHeading')}</FooterHeading>
            {legalLinks.map((link) => (
              <FooterLink key={link.id} href={link.href}>
                {link.label}
              </FooterLink>
            ))}
          </nav>

          <nav
            className="flex flex-col gap-3"
            aria-label={t('languageHeading')}
          >
            <FooterHeading>{t('languageHeading')}</FooterHeading>
            {locales.map((code) => (
              <FooterLink
                key={code}
                href={`/${code}${pathWithoutLocale}${queryString}`}
                isCurrent={code === locale}
              >
                {localeNames[code] ?? code.toUpperCase()}
              </FooterLink>
            ))}
          </nav>
        </div>
      </div>

      <div className="border-primary-darker border-t">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="text-gray-500 text-xs">{t('copyright', { year })}</p>
          <p className="text-gray-500 text-xs">{t('notAffiliated')}</p>
        </div>
      </div>
    </footer>
  );
};

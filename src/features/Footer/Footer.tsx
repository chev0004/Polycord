'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { FaDiscord } from 'react-icons/fa';
import { siteContainerClass } from '@/components/Container';
import { LocaleLink } from '@/features/Navbar/LocaleLink';
import { useRouteProgress } from '@/features/Navigation/RouteProgress';
import { locales } from '@/utils/locales';
import { FooterMascot } from './FooterMascot';

type FooterProps = {
  locale: string;
  inviteUrl?: string;
};

const localeNames: Record<string, string> = {
  en: 'English',
  ja: '日本語',
};

const hairlineClassName = 'border-[rgba(107,114,128,0.22)]';

const linkClassName =
  'w-fit rounded-[4px] text-muted text-sm leading-5 no-underline transition-colors duration-200 hover:text-foreground focus-visible:text-foreground focus-visible:underline max-sm:flex max-sm:min-h-11 max-sm:items-center';

type FooterLinkProps = {
  href: string;
  children: React.ReactNode;
};

const FooterLink = ({ href, children }: FooterLinkProps) => {
  const { start } = useRouteProgress();

  return (
    <Link
      href={href}
      prefetch={href.includes('/legal')}
      onNavigate={() => start(href)}
      className={linkClassName}
    >
      {children}
    </Link>
  );
};

const FooterColumn = ({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) => (
  <nav aria-label={heading}>
    <h2 className="mb-3.5 font-semibold text-[12px] text-muted uppercase leading-4 tracking-[0.08em] max-sm:mb-1">
      {heading}
    </h2>
    <ul className="flex flex-col gap-3 max-sm:gap-0">{children}</ul>
  </nav>
);

export const Footer: React.FC<FooterProps> = ({
  locale,
  inviteUrl = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL,
}) => {
  const t = useTranslations('Footer');
  const tLegal = useTranslations('Legal');
  const year = new Date().getFullYear();

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
    <footer
      className={`relative mt-[72px] w-full border-t ${hairlineClassName} bg-background-darker font-figtree`}
    >
      <div className={`${siteContainerClass} relative pt-12 pb-8 sm:pt-14`}>
        <FooterMascot />

        <div className="grid gap-10 min-[981px]:grid-cols-[minmax(0,1fr)_auto] min-[981px]:gap-12">
          <div>
            <Link
              href={`/${locale}`}
              aria-label={t('brand')}
              className="flex h-5 w-max"
            >
              <Image
                src="/polycord-wordmark.svg"
                alt=""
                width={75}
                height={20}
                className="block h-5 w-auto"
              />
            </Link>
            <p className="mt-4 text-muted text-sm leading-normal">
              {t('tagline')}
            </p>
            <p className="mt-3 max-w-[390px] text-muted text-xs leading-[1.6] [text-wrap:pretty]">
              {t('safetyNote')}
            </p>
            {inviteUrl ? (
              <a
                href={inviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 flex w-fit select-none items-center justify-center gap-2 whitespace-nowrap rounded-control border border-primary-dark px-4 py-2 font-light text-primary-light text-sm transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-primary-darker focus-visible:bg-primary-darker active:scale-[0.98] max-sm:min-h-11"
              >
                <FaDiscord size={18} className="shrink-0" />
                {t('joinDiscord')}
              </a>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-[repeat(3,max-content)] sm:gap-x-16">
            <FooterColumn heading={t('exploreHeading')}>
              {exploreLinks.map((link) => (
                <li key={link.id}>
                  <FooterLink href={link.href}>{link.label}</FooterLink>
                </li>
              ))}
            </FooterColumn>

            <FooterColumn heading={t('legalHeading')}>
              {legalLinks.map((link) => (
                <li key={link.id}>
                  <FooterLink href={link.href}>{link.label}</FooterLink>
                </li>
              ))}
            </FooterColumn>

            <FooterColumn heading={t('languageHeading')}>
              {locales.map((code) => (
                <li key={code}>
                  <LocaleLink
                    locale={code}
                    className={`${linkClassName} ${code === locale ? 'text-primary-light' : ''}`}
                  >
                    {localeNames[code] ?? code.toUpperCase()}
                  </LocaleLink>
                </li>
              ))}
            </FooterColumn>
          </div>
        </div>

        <div
          className={`mt-12 flex flex-col flex-wrap justify-between gap-x-8 gap-y-2 border-t ${hairlineClassName} pt-6 text-[13px] text-muted leading-5 max-sm:mt-10 sm:flex-row`}
        >
          <span>{t('copyright', { year })}</span>
          <span>{t('notAffiliated')}</span>
        </div>
      </div>
    </footer>
  );
};

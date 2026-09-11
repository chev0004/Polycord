'use client';

import { useTranslations } from 'next-intl';
import { MdArrowForward } from 'react-icons/md';
import { useRouteProgressRouter } from '@/features/Navigation/RouteProgress';
import { LegalShell } from './LegalShell';
import { LEGAL_DOCUMENT_IDS } from './legalContent';

type LegalHubProps = {
  locale: string;
  isLoggedIn: boolean;
  userAvatarUrl?: string;
};

export const LegalHub = ({
  locale,
  isLoggedIn,
  userAvatarUrl,
}: LegalHubProps) => {
  const t = useTranslations('Legal');
  const router = useRouteProgressRouter();

  return (
    <LegalShell
      locale={locale}
      isLoggedIn={isLoggedIn}
      userAvatarUrl={userAvatarUrl}
    >
      <div className="mx-auto w-full max-w-3xl px-4 py-12 font-figtree sm:px-8">
        <p className="font-semibold text-primary text-sm uppercase tracking-wide">
          {t('eyebrow')}
        </p>
        <h1 className="mt-2 font-black text-3xl text-white tracking-[-0.01em] sm:text-4xl">
          {t('hubTitle')}
        </h1>
        <p className="mt-3 max-w-xl text-[15px] text-gray-400 leading-relaxed">
          {t('hubDescription')}
        </p>

        <div className="mt-10 flex flex-col gap-4">
          {LEGAL_DOCUMENT_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => router.push(`/${locale}/legal/${id}`)}
              className="group flex items-center justify-between gap-4 rounded-lg border border-primary-darker bg-background-darker px-5 py-4 text-left transition-colors hover:border-primary-dark focus-visible:border-primary focus-visible:bg-background-dark"
            >
              <span>
                <span className="block font-bold text-lg text-white">
                  {t(`${id}Title`)}
                </span>
                <span className="mt-1 block text-gray-400 text-sm leading-relaxed">
                  {t(`${id}Summary`)}
                </span>
              </span>
              <MdArrowForward
                className="shrink-0 text-gray-500 transition-colors group-hover:text-primary"
                size={22}
              />
            </button>
          ))}
        </div>
      </div>
    </LegalShell>
  );
};

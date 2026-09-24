'use client';

import { useTranslations } from 'next-intl';
import { MdArrowForward } from 'react-icons/md';
import { useRouteProgressRouter } from '@/features/Navigation/RouteProgress';
import { LEGAL_DOCUMENT_IDS } from './legalContent';

type LegalHubProps = {
  locale: string;
};

export const LegalHub = ({ locale }: LegalHubProps) => {
  const t = useTranslations('Legal');
  const router = useRouteProgressRouter();

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-3xl px-4 py-12 font-figtree sm:px-8">
        <p className="font-semibold text-primary text-sm uppercase tracking-wide">
          {t('eyebrow')}
        </p>
        <h1 className="mt-2 font-black text-3xl text-foreground tracking-[-0.01em] sm:text-4xl">
          {t('hubTitle')}
        </h1>
        <p className="mt-3 max-w-xl text-[15px] text-muted leading-relaxed">
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
                <span className="block font-bold text-foreground text-lg">
                  {t(`${id}Title`)}
                </span>
                <span className="mt-1 block text-muted text-sm leading-relaxed">
                  {t(`${id}Summary`)}
                </span>
              </span>
              <MdArrowForward
                className="shrink-0 text-subtle transition-colors group-hover:text-primary"
                size={22}
              />
            </button>
          ))}
        </div>
      </div>
    </main>
  );
};

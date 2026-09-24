'use client';

import { useTranslations } from 'next-intl';
import { MdArrowBack, MdInfoOutline } from 'react-icons/md';
import { useRouteProgressRouter } from '@/features/Navigation/RouteProgress';
import { LegalShell } from './LegalShell';
import type { LegalDocumentContent, LegalDocumentId } from './legalContent';

type LegalDocumentProps = {
  locale: string;
  documentId: LegalDocumentId;
  content: LegalDocumentContent;
  isFallback: boolean;
  isLoggedIn: boolean;
  userAvatarUrl?: string;
};

export const LegalDocument = ({
  locale,
  documentId,
  content,
  isFallback,
  isLoggedIn,
  userAvatarUrl,
}: LegalDocumentProps) => {
  const t = useTranslations('Legal');
  const router = useRouteProgressRouter();
  const formattedDate = new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(content.lastUpdated));

  return (
    <LegalShell
      locale={locale}
      isLoggedIn={isLoggedIn}
      userAvatarUrl={userAvatarUrl}
    >
      <article className="mx-auto w-full max-w-3xl px-4 py-10 font-figtree sm:px-8">
        <button
          type="button"
          onClick={() => router.push(`/${locale}/legal`)}
          className="mb-6 inline-flex items-center gap-1.5 text-muted text-sm transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:underline"
        >
          <MdArrowBack size={18} />
          {t('backToLegal')}
        </button>

        <p className="font-semibold text-primary text-sm uppercase tracking-wide">
          {t('eyebrow')}
        </p>
        <h1 className="mt-2 font-black text-3xl text-foreground tracking-[-0.01em] sm:text-4xl">
          {t(`${documentId}Title`)}
        </h1>
        <p className="mt-3 text-muted text-sm">
          {t('lastUpdated', { date: formattedDate })}
        </p>

        {isFallback ? (
          <div className="mt-6 flex items-start gap-2.5 rounded-md border border-primary-dark bg-background-darker px-4 py-3 text-sm text-soft">
            <MdInfoOutline className="mt-0.5 shrink-0 text-primary" size={18} />
            <p>{t('fallbackNotice')}</p>
          </div>
        ) : null}

        <p className="mt-8 text-[15px] text-soft leading-relaxed">
          {content.intro}
        </p>

        <div className="mt-10 flex flex-col gap-10">
          {content.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-bold text-foreground text-xl tracking-[-0.01em]">
                {section.heading}
              </h2>
              {section.paragraphs?.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-3 text-[15px] text-soft leading-relaxed"
                >
                  {paragraph}
                </p>
              ))}
              {section.list ? (
                <ul className="mt-3 flex flex-col gap-2">
                  {section.list.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2.5 text-[15px] text-soft leading-relaxed"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </article>
    </LegalShell>
  );
};

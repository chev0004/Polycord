'use client';

import { useEffect, useState } from 'react';
import en from '@/locales/en.json';
import ja from '@/locales/ja.json';

export function RecoveryPage({
  kind,
  locale,
  reset,
}: {
  kind: 'missing' | 'error';
  locale?: string;
  reset?: () => void;
}) {
  const [language, setLanguage] = useState(locale ?? 'en');
  useEffect(() => {
    if (!locale) {
      setLanguage(
        window.location.pathname.split('/')[1] === 'ja' ? 'ja' : 'en',
      );
    }
  }, [locale]);
  const copy = language === 'ja' ? ja.Recovery : en.Recovery;
  const actionClass =
    'rounded-lg border border-line-strong px-5 py-3 font-semibold hover:bg-overlay focus-visible:bg-overlay';

  return (
    <main
      lang={language}
      className="flex min-h-screen items-center justify-center bg-background-main px-4 py-12 text-foreground"
    >
      <section className="w-full max-w-lg space-y-6 rounded-xl border border-line bg-background-dark p-6 sm:p-10">
        <p className="font-semibold text-primary">{copy.brand}</p>
        <h1 className="font-bold text-3xl">
          {kind === 'missing' ? copy.missingTitle : copy.errorTitle}
        </h1>
        <p className="text-soft">
          {kind === 'missing' ? copy.missingDescription : copy.errorDescription}
        </p>
        <div className="flex flex-wrap gap-3">
          {reset && (
            <button type="button" onClick={reset} className={actionClass}>
              {copy.retry}
            </button>
          )}
          <a href={`/${language}`} className={actionClass}>
            {copy.home}
          </a>
        </div>
      </section>
    </main>
  );
}

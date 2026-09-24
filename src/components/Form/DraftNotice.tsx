'use client';

import { useLocale, useTranslations } from 'next-intl';
import { signInHref } from '@/features/Navigation/signIn';

export const DraftNotice = ({
  restored,
  stored,
  unavailable,
  sessionExpired = false,
}: {
  restored: boolean;
  stored: boolean;
  unavailable: boolean;
  sessionExpired?: boolean;
}) => {
  const t = useTranslations('Draft');
  const locale = useLocale();
  if (!restored && !stored && !unavailable && !sessionExpired) return null;
  return (
    <output className="mb-5 block rounded-xl bg-background-dark px-4 py-3 text-sm text-soft">
      {t(unavailable ? 'unavailable' : restored ? 'restored' : 'savedLocally')}
      {sessionExpired ? (
        <a
          className="mt-2 block font-semibold text-primary-light underline focus-visible:text-primary-lighter"
          href={signInHref(locale)}
        >
          {t('signInAgain')}
        </a>
      ) : null}
    </output>
  );
};

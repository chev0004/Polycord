'use client';

import { useLocale, useTranslations } from 'next-intl';

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
          className="mt-2 block font-semibold text-primary-light underline"
          href={`/api/auth/discord?locale=${locale}&editor=${window.location.pathname.split('/').pop()}`}
        >
          {t('signInAgain')}
        </a>
      ) : null}
    </output>
  );
};

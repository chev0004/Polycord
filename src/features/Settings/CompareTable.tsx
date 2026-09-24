'use client';

import { useTranslations } from 'next-intl';

const COLUMNS =
  'grid-cols-2 sm:grid-cols-[minmax(0,1fr)_110px_140px] min-[720px]:grid-cols-[minmax(0,1fr)_150px_170px]';

type CompareRow = {
  feature: string;
  sub: string;
  free: string | null;
  premium: string;
};

const CMP_ROWS: CompareRow[] = [
  {
    feature: 'compareBumpFeature',
    sub: 'compareBumpSub',
    free: 'compareBumpFree',
    premium: 'compareBumpPremium',
  },
  {
    feature: 'compareLanguagesFeature',
    sub: 'compareLanguagesSub',
    free: 'compareLanguagesFree',
    premium: 'compareLanguagesPremium',
  },
  {
    feature: 'compareTagsFeature',
    sub: 'compareTagsSub',
    free: 'compareTagsFree',
    premium: 'compareTagsPremium',
  },
  {
    feature: 'compareColoursFeature',
    sub: 'compareColoursSub',
    free: 'compareColoursFree',
    premium: 'compareColoursPremium',
  },
  {
    feature: 'compareVoiceFeature',
    sub: 'compareVoiceSub',
    free: null,
    premium: 'compareVoicePremium',
  },
  {
    feature: 'compareCopyFeature',
    sub: 'compareCopySub',
    free: 'compareCopyFree',
    premium: 'compareCopyPremium',
  },
  {
    feature: 'compareViewFeature',
    sub: 'compareViewSub',
    free: null,
    premium: 'compareViewPremium',
  },
];

export const CompareTable = () => {
  const t = useTranslations('Settings');

  return (
    <table className="block overflow-hidden rounded-2xl border border-line text-left">
      <caption className="sr-only">{t('compareTableLabel')}</caption>
      <thead className="block">
        <tr className={`grid items-center ${COLUMNS}`}>
          <th className="sr-only px-4 py-3 font-semibold text-[11px] text-subtle uppercase tracking-[0.06em] sm:not-sr-only sm:px-4 sm:py-3">
            {t('compareFeatureHeader')}
          </th>
          <th className="px-4 py-3 font-semibold text-[11px] text-subtle uppercase tracking-[0.06em]">
            {t('compareFreeHeader')}
          </th>
          <th className="flex h-full items-center bg-background-darker px-4 py-3 font-semibold text-[11px] text-foreground uppercase tracking-[0.06em]">
            {t('comparePremiumHeader')}
          </th>
        </tr>
      </thead>
      <tbody className="block">
        {CMP_ROWS.map((row) => (
          <tr
            key={row.feature}
            className={`grid items-center border-line border-t ${COLUMNS}`}
          >
            <th
              scope="row"
              className="col-span-2 px-4 pt-3.5 font-normal sm:col-span-1 sm:pb-3.5"
            >
              <p className="font-medium text-[14px] text-foreground">
                {t(row.feature)}
              </p>
              <p className="mt-0.5 text-[12px] text-subtle">{t(row.sub)}</p>
            </th>
            <td className="px-4 py-3.5 font-light text-[13.5px] text-muted">
              {row.free ? (
                t(row.free)
              ) : (
                <span className="text-subtle">{t('compareNoValue')}</span>
              )}
            </td>
            <td className="flex h-full items-center gap-[7px] bg-background-darker px-4 py-3.5 font-medium text-[13.5px] text-foreground">
              <span aria-hidden="true" className="font-bold text-primary-light">
                ✓
              </span>
              {t(row.premium)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

'use client';

import { useTranslations } from 'next-intl';

const COLUMNS =
  'grid-cols-[minmax(0,1fr)_90px_130px] min-[720px]:grid-cols-[minmax(0,1fr)_150px_170px]';

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
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div className={`grid items-center ${COLUMNS}`}>
        <div className="px-4 py-3 font-semibold text-[11px] text-gray-500 uppercase tracking-[0.06em]">
          {t('compareFeatureHeader')}
        </div>
        <div className="px-4 py-3 font-semibold text-[11px] text-gray-500 uppercase tracking-[0.06em]">
          {t('compareFreeHeader')}
        </div>
        <div className="flex h-full items-center bg-background-darker px-4 py-3 font-semibold text-[11px] text-white uppercase tracking-[0.06em]">
          {t('comparePremiumHeader')}
        </div>
      </div>
      {CMP_ROWS.map((row) => (
        <div
          key={row.feature}
          className={`grid items-center border-white/10 border-t ${COLUMNS}`}
        >
          <div className="px-4 py-3.5">
            <p className="font-medium text-[14px] text-white">
              {t(row.feature)}
            </p>
            <p className="mt-0.5 text-[12px] text-gray-500">{t(row.sub)}</p>
          </div>
          <div className="px-4 py-3.5 font-light text-[13.5px] text-gray-400">
            {row.free ? (
              t(row.free)
            ) : (
              <span className="text-gray-500">{t('compareNoValue')}</span>
            )}
          </div>
          <div className="flex h-full items-center gap-[7px] bg-background-darker px-4 py-3.5 font-medium text-[13.5px] text-white">
            <span aria-hidden="true" className="font-bold text-primary-light">
              ✓
            </span>
            {t(row.premium)}
          </div>
        </div>
      ))}
    </div>
  );
};

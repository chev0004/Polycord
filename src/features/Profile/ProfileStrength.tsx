'use client';

import { useTranslations } from 'next-intl';
import { MdCheckCircle, MdRadioButtonUnchecked } from 'react-icons/md';
import type { CompletenessFieldKey } from '@/lib/profileCompleteness';

const fieldLabelKeys: Record<CompletenessFieldKey, string> = {
  primaryLanguage: 'completenessPrimaryLanguage',
  targetLanguages: 'completenessTargetLanguages',
  bio: 'completenessBio',
  availability: 'completenessAvailability',
  tags: 'completenessTags',
  country: 'completenessCountry',
};

type ProfileStrengthProps = {
  score: number;
  missing: CompletenessFieldKey[];
};

export const ProfileStrength = ({ score, missing }: ProfileStrengthProps) => {
  const t = useTranslations('Profile');
  const complete = missing.length === 0;

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-background-dark p-4 shadow-xl">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-[11px] text-gray-500 uppercase tracking-[0.06em]">
          {t('profileStrength')}
        </span>
        <span className="font-semibold text-[13px] text-primary-light">
          {score}%
        </span>
      </div>

      <div className="h-2 rounded-full bg-background-darker">
        <div
          className="h-2 rounded-full bg-primary transition-all"
          style={{ width: `${score}%` }}
        />
      </div>

      {complete ? (
        <p className="flex items-center gap-1.5 text-[13px] text-gray-400">
          <MdCheckCircle size={16} className="shrink-0 text-primary" />
          {t('completenessComplete')}
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <p className="text-[12px] text-gray-500">{t('completenessHint')}</p>
          <ul className="flex flex-col gap-1">
            {missing.map((key) => (
              <li
                key={key}
                className="flex items-center gap-1.5 text-[13px] text-gray-300"
              >
                <MdRadioButtonUnchecked
                  size={15}
                  className="shrink-0 text-gray-600"
                />
                {t(fieldLabelKeys[key])}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

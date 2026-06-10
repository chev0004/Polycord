'use client';

import { useTranslations } from 'next-intl';

const SKELETON_CARD_COUNT = 6;

const skeletonCardKeys = Array.from(
  { length: SKELETON_CARD_COUNT },
  (_, index) => `profile-card-skeleton-${index}`,
);

export const ProfileGridSkeleton = () => {
  const t = useTranslations('Discovery');

  return (
    <output aria-label={t('feedLoadingLabel')} className="flex flex-col gap-6">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap justify-center gap-8">
        {skeletonCardKeys.map((key) => (
          <div
            key={key}
            className="flex w-full max-w-sm animate-pulse flex-col gap-4 rounded-2xl bg-background-dark p-4 shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-background-darker" />
              <div className="flex flex-col gap-2">
                <div className="h-4 w-32 rounded bg-background-darker" />
                <div className="h-3 w-24 rounded bg-background-darker" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-6 w-24 rounded-md bg-background-darker" />
              <div className="h-6 w-24 rounded-md bg-background-darker" />
            </div>
            <div className="h-44 rounded-2xl bg-background-darker" />
          </div>
        ))}
      </div>
    </output>
  );
};

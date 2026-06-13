'use client';

import { useTranslations } from 'next-intl';

const SKELETON_CARD_COUNT = 6;

const skeletonCardKeys = Array.from(
  { length: SKELETON_CARD_COUNT },
  (_, index) => `profile-card-skeleton-${index}`,
);

const splitIntoColumns = <T,>(items: T[], columnCount: number) => {
  const columnSize = Math.ceil(items.length / columnCount);

  return Array.from({ length: columnCount }, (_, columnIndex) =>
    items.slice(columnIndex * columnSize, (columnIndex + 1) * columnSize),
  ).filter((column) => column.length > 0);
};

const SkeletonCard = () => (
  <article className="mb-6 flex w-full flex-col gap-4 rounded-2xl bg-background-dark shadow-lg">
    <div className="-mb-2 h-16 rounded-t-2xl bg-primary-darker" />
    <div className="-mt-10 flex flex-col gap-4 px-5 pb-5">
      <div className="flex items-end justify-between">
        <div className="rounded-full bg-background-dark p-[7px]">
          <div className="skeleton-shimmer h-14 w-14 rounded-full" />
        </div>
        <div className="flex items-center gap-1.5 pb-1">
          <div className="skeleton-shimmer h-6 w-16 rounded-full" />
          <div className="skeleton-shimmer h-[26px] w-[26px] rounded-full" />
        </div>
      </div>
      <div className="-mt-1 flex flex-col gap-1">
        <div className="skeleton-shimmer h-4 w-[120px] rounded" />
        <div className="skeleton-shimmer h-3 w-[90px] rounded" />
      </div>
      <div className="flex gap-2">
        <div className="skeleton-shimmer h-7 w-[72px] rounded-md" />
        <div className="skeleton-shimmer h-7 w-[104px] rounded-md" />
      </div>
      <div className="flex flex-col gap-4 rounded-2xl bg-background-darker p-4">
        <div className="flex flex-col gap-2">
          <div className="skeleton-shimmer h-2.5 w-10 rounded" />
          <div className="flex gap-2">
            <div className="skeleton-shimmer h-6 w-16 rounded-md" />
            <div className="skeleton-shimmer h-6 w-[78px] rounded-md" />
            <div className="skeleton-shimmer h-6 w-14 rounded-md" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="skeleton-shimmer h-2.5 w-10 rounded" />
          <div className="flex flex-col gap-1.5">
            <div className="skeleton-shimmer h-3 w-full rounded" />
            <div className="skeleton-shimmer h-3 w-[90%] rounded" />
            <div className="skeleton-shimmer h-3 w-[60%] rounded" />
          </div>
        </div>
      </div>
    </div>
  </article>
);

export const ProfileGridSkeleton = () => {
  const t = useTranslations('Discovery');

  const renderSkeletonColumns = (columnCount: number, className: string) => (
    <div className={`mx-auto w-full max-w-[1180px] gap-6 ${className}`}>
      {splitIntoColumns(skeletonCardKeys, columnCount).map((column) => (
        <div
          key={`profile-skeleton-column-${columnCount}-${column[0]}`}
          className="flex min-w-0 flex-col"
        >
          {column.map((key) => (
            <SkeletonCard key={key} />
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <output aria-label={t('feedLoadingLabel')} className="flex flex-col gap-6">
      {renderSkeletonColumns(1, 'grid grid-cols-1 md:hidden')}
      {renderSkeletonColumns(2, 'hidden md:grid md:grid-cols-2 lg:hidden')}
      {renderSkeletonColumns(3, 'hidden lg:grid lg:grid-cols-3')}
    </output>
  );
};

'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { MdClose } from 'react-icons/md';
import type { FilterButtonProps } from './FilterButton';
import { FilterButton } from './FilterButton';

export type FilterConfig = Omit<FilterButtonProps, 'onValueChange'> & {
  id: string;
};

export type FilterBarProps = {
  filters: FilterConfig[];
  values?: Record<string, string | string[]>;
  onFilterChange?: (filterId: string, value: string | string[]) => void;
  onClearFilters?: () => void;
  sortControl?: ReactNode;
  className?: string;
  ariaLabel?: string;
};

export const FilterBar = ({
  filters,
  values = {},
  onFilterChange,
  onClearFilters,
  sortControl,
  className,
  ariaLabel,
}: FilterBarProps) => {
  const t = useTranslations('Discovery');

  const hasActiveFilter = filters.some((filter) => {
    const value = values[filter.id];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  });

  return (
    <fieldset
      className={`m-0 flex flex-wrap items-center gap-1.5 border-0 p-0 ${className ?? ''}`}
      aria-label={ariaLabel}
    >
      {filters.map((filter) => (
        <FilterButton
          key={filter.id}
          {...filter}
          value={values[filter.id] ?? (filter.multiple ? [] : '')}
          onValueChange={(value) => onFilterChange?.(filter.id, value)}
          multiple={filter.multiple}
        />
      ))}
      {hasActiveFilter && (
        <button
          type="button"
          onClick={onClearFilters}
          className="inline-flex h-10 items-center gap-1 rounded-full px-2.5 text-gray-400 text-sm transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-background-dark hover:text-white"
        >
          <MdClose size={16} className="flex-shrink-0" />
          {t('filterClear')}
        </button>
      )}
      {sortControl && <div className="ml-auto flex">{sortControl}</div>}
    </fieldset>
  );
};

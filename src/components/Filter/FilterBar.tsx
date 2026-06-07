'use client';

import type { FilterButtonProps } from './FilterButton';
import { FilterButton } from './FilterButton';

export type FilterConfig = Omit<FilterButtonProps, 'onValueChange'> & {
  id: string;
};

export type FilterBarProps = {
  filters: FilterConfig[];
  values?: Record<string, string | string[]>;
  onFilterChange?: (filterId: string, value: string | string[]) => void;
  className?: string;
  ariaLabel?: string;
};

export const FilterBar = ({
  filters,
  values = {},
  onFilterChange,
  className,
  ariaLabel,
}: FilterBarProps) => {
  const handleFilterChange = (filterId: string, value: string | string[]) => {
    onFilterChange?.(filterId, value);
  };

  return (
    <fieldset
      className={`m-0 flex flex-wrap items-center gap-3 border-0 p-0 ${className ?? ''}`}
      aria-label={ariaLabel}
    >
      {filters.map((filter) => (
        <FilterButton
          key={filter.id}
          {...filter}
          value={values[filter.id] ?? (filter.multiple ? [] : '')}
          onValueChange={(value) => handleFilterChange(filter.id, value)}
          multiple={filter.multiple}
        />
      ))}
    </fieldset>
  );
};

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
};

export const FilterBar = ({
  filters,
  values = {},
  onFilterChange,
  className,
}: FilterBarProps) => {
  const handleFilterChange = (filterId: string, value: string | string[]) => {
    onFilterChange?.(filterId, value);
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-3 ${className ?? ''}`}
      role="group"
      aria-label="Filter options"
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
    </div>
  );
};

'use client';

import { useTranslations } from 'next-intl';
import { MdSearch } from 'react-icons/md';

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export const SearchBar = ({ value, onChange }: SearchBarProps) => {
  const t = useTranslations('Discovery');

  return (
    <div className="relative h-[50px]">
      <MdSearch
        size={22}
        aria-hidden
        className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-[18px] text-subtle"
      />
      <input
        type="text"
        maxLength={200}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchLabel')}
        className="h-[50px] w-full rounded-full border border-line bg-background-darker pr-[18px] pl-12 text-[15px] text-foreground placeholder-subtle outline-none transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-line-strong focus:border-line-strong focus:outline-none"
      />
    </div>
  );
};

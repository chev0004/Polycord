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
        className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-[18px] text-gray-500"
      />
      <input
        type="text"
        maxLength={200}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchLabel')}
        className="h-[50px] w-full rounded-full border border-white/[0.07] bg-background-darker pr-[18px] pl-12 text-[15px] text-white placeholder-gray-500 outline-none transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-white/[0.14] focus:border-white/[0.14] focus:outline-none"
      />
    </div>
  );
};

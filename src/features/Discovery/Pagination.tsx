'use client';

import { useTranslations } from 'next-intl';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const arrowClassName =
  'flex p-1 text-white transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] enabled:hover:text-gray-400 disabled:cursor-not-allowed disabled:text-gray-600';

export const Pagination = ({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) => {
  const t = useTranslations('Discovery');

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-9 flex items-center justify-center gap-[18px]">
      <button
        type="button"
        aria-label={t('paginationPrevious')}
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        className={arrowClassName}
      >
        <MdChevronLeft size={22} />
      </button>
      <span className="text-[13px] text-gray-400">
        {t('paginationLabel', { page, total: totalPages })}
      </span>
      <button
        type="button"
        aria-label={t('paginationNext')}
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
        className={arrowClassName}
      >
        <MdChevronRight size={22} />
      </button>
    </div>
  );
};

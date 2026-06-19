'use client';

import * as Popover from '@radix-ui/react-popover';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { MdCheck, MdSwapVert } from 'react-icons/md';
import { type DiscoverySortValue, SORT_OPTIONS } from './discoverySort';

type SortMenuProps = {
  value: DiscoverySortValue;
  onChange: (value: DiscoverySortValue) => void;
  options?: readonly DiscoverySortValue[];
};

const sortOptionLabelKeys: Record<DiscoverySortValue, string> = {
  match: 'sortBestMatch',
  'bumped-desc': 'sortLastBumped',
  'bumped-asc': 'sortOldestBumped',
  'name-asc': 'sortNameAsc',
  'name-desc': 'sortNameDesc',
};

export const SortMenu = ({
  value,
  onChange,
  options = SORT_OPTIONS,
}: SortMenuProps) => {
  const t = useTranslations('Discovery');
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={t('sortLabel')}
          title={t('sortLabel')}
          className="flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-background-dark hover:text-white data-[state=open]:bg-background-dark data-[state=open]:text-white"
        >
          <MdSwapVert size={20} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="PopoverContent z-50 min-w-[200px] rounded-[18px] border border-gray-500/50 bg-background-dark p-1.5 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.5),0_4px_6px_-4px_rgba(0,0,0,0.5)]"
          side="bottom"
          align="end"
          sideOffset={8}
        >
          <div className="px-2.5 pt-1.5 pb-1 font-semibold text-[11px] text-gray-500 uppercase tracking-[0.06em]">
            {t('sortByLabel')}
          </div>
          {options.map((option) => {
            const active = option === value;

            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className={`flex h-[38px] w-full items-center gap-2.5 rounded-full px-3 text-left text-sm transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  active
                    ? 'bg-background-main text-primary-light'
                    : 'text-white hover:bg-background-main'
                }`}
              >
                <span className="flex-1">{t(sortOptionLabelKeys[option])}</span>
                {active ? (
                  <MdCheck size={18} aria-hidden className="text-primary" />
                ) : null}
              </button>
            );
          })}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

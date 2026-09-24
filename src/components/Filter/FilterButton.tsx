'use client';

import * as Popover from '@radix-ui/react-popover';
import { useTranslations } from 'next-intl';
import React, { useMemo, useRef, useState } from 'react';
import type { IconType } from 'react-icons';
import { MdCheck, MdOutlineKeyboardArrowDown, MdSearch } from 'react-icons/md';
import { Button } from '../Button';

export type FilterButtonProps = {
  icon: IconType;
  labelKey: string;
  placeholderKey?: string;
  options: { label: string; value: string }[];
  className?: string;
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  multiple?: boolean;
};

const SEARCHABLE_THRESHOLD = 8;

const toSelection = (value: string | string[] | undefined): string[] => {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
};

export const FilterButton = React.forwardRef<
  HTMLButtonElement,
  FilterButtonProps
>(
  (
    {
      icon: Icon,
      labelKey,
      placeholderKey,
      options,
      className,
      value,
      onValueChange,
      multiple = false,
      ...props
    },
    forwardedRef,
  ) => {
    const t = useTranslations('Discovery');
    const label = t(labelKey);
    const [open, setOpen] = useState(false);
    const [selection, setSelection] = useState<string[]>([]);
    const [search, setSearch] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

    const applied = toSelection(value);
    const active = applied.length > 0;
    const searchable = options.length > SEARCHABLE_THRESHOLD;

    const handleOpenChange = (nextOpen: boolean) => {
      if (nextOpen) {
        setSelection(applied);
        setSearch('');
      }
      setOpen(nextOpen);
    };

    const toggleOption = (optionValue: string) => {
      setSelection((current) => {
        if (current.includes(optionValue)) {
          return current.filter((v) => v !== optionValue);
        }
        return multiple ? [...current, optionValue] : [optionValue];
      });
    };

    const handleApply = () => {
      onValueChange?.(multiple ? selection : (selection[0] ?? ''));
      setOpen(false);
    };

    const handleCancel = () => {
      setOpen(false);
    };

    const shownOptions = useMemo(() => {
      if (!searchable || !search) return options;
      const query = search.toLowerCase();
      return options.filter((option) =>
        option.label.toLowerCase().includes(query),
      );
    }, [options, search, searchable]);

    const getDisplayText = () => {
      if (applied.length === 1) {
        const option = options.find((opt) => opt.value === applied[0]);
        return option?.label ?? label;
      }
      return label;
    };

    return (
      <Popover.Root open={open} onOpenChange={handleOpenChange}>
        <Popover.Trigger asChild>
          <button
            ref={forwardedRef}
            type="button"
            className={`group inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-3.5 font-medium text-sm transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] data-[state=open]:bg-background-dark ${
              active
                ? 'bg-primary-darker text-primary-light'
                : 'bg-transparent text-foreground hover:bg-background-dark focus-visible:bg-background-dark'
            } ${className ?? ''}`}
            {...props}
          >
            <Icon
              size={18}
              className={`flex-shrink-0 ${active ? 'text-primary' : 'text-muted'}`}
            />
            <span>{getDisplayText()}</span>
            {active && (
              <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-[5px] font-bold text-[11px] text-on-primary">
                {applied.length}
              </span>
            )}
            <MdOutlineKeyboardArrowDown
              size={16}
              className={`flex-shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[state=open]:rotate-180 ${
                active ? 'text-primary' : 'text-muted'
              }`}
            />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="PopoverContent z-50 w-[280px] rounded-[20px] border border-gray-500/50 bg-background-dark p-4 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.5),0_4px_6px_-4px_rgba(0,0,0,0.5)]"
            side="bottom"
            align="start"
            sideOffset={8}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              searchInputRef.current?.focus();
            }}
          >
            <div className="mb-3 font-medium text-muted text-sm">{label}</div>

            {searchable && (
              <div className="relative mb-2.5">
                <MdSearch
                  size={18}
                  className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 text-subtle"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={
                    placeholderKey
                      ? t(placeholderKey)
                      : t('filterSearchPlaceholder')
                  }
                  className="h-[38px] w-full rounded-full border border-line bg-background-darker pr-3.5 pl-[34px] text-foreground text-sm outline-none transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] placeholder:text-subtle hover:border-line-strong focus:border-line-strong"
                />
              </div>
            )}

            <div className="mb-3 flex max-h-60 flex-col gap-0.5 overflow-y-auto">
              {shownOptions.length > 0 ? (
                shownOptions.map((option) => {
                  const on = selection.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleOption(option.value)}
                      aria-pressed={on}
                      className={`flex min-h-[38px] w-full flex-shrink-0 items-center gap-2.5 rounded-full px-3 text-left text-sm transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        on
                          ? 'bg-background-main text-primary-light'
                          : 'text-foreground hover:bg-primary-darker'
                      }`}
                    >
                      <span
                        className={`flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[5px] border text-on-primary transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          on
                            ? 'border-primary bg-primary'
                            : 'border-line-strong'
                        }`}
                      >
                        {on && <MdCheck size={14} />}
                      </span>
                      <span className="truncate">{option.label}</span>
                    </button>
                  );
                })
              ) : (
                <div className="p-4 text-center text-sm text-subtle">
                  {t('filterNoResults')}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-gray-700 border-t pt-3">
              <Button variant="outline" onClick={handleCancel}>
                {t('filterCancel')}
              </Button>
              <Button variant="primary" onClick={handleApply}>
                {t('filterApply')}
              </Button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  },
);

FilterButton.displayName = 'FilterButton';

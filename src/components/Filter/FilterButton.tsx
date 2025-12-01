'use client';

import * as Popover from '@radix-ui/react-popover';
import { useTranslations } from 'next-intl';
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { IconType } from 'react-icons';
import {
  MdCheck,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdOutlineKeyboardArrowDown,
} from 'react-icons/md';
import { Tooltip } from '@/components/Tooltip';
import { Button } from '../Button';
import { Dropdown } from '../Form/Dropdown';

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

// Batch size configuration for progressive rendering
const INITIAL_BATCH = 20;
const CHUNK_SIZE = 50;
const CHUNK_INTERVAL_MS = 16;

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
    const placeholder = placeholderKey ? t(placeholderKey) : undefined;
    const [open, setOpen] = useState(false);
    const [tempValue, setTempValue] = useState<string | string[]>(
      value || (multiple ? [] : ''),
    );

    useEffect(() => {
      if (open) {
        setTempValue(value || (multiple ? [] : ''));
      }
    }, [open, value, multiple]);

    const handleApply = () => {
      onValueChange?.(tempValue);
      setOpen(false);
    };

    const handleCancel = () => {
      setTempValue(value || (multiple ? [] : ''));
      setOpen(false);
    };

    const getDisplayText = () => {
      if (multiple) {
        const values = Array.isArray(value) ? value : [];
        if (values.length === 0) return label;
        if (values.length === 1) {
          const option = options.find((opt) => opt.value === values[0]);
          return option?.label || label;
        }
        return `${values.length} selected`;
      } else {
        if (!value || value === '') return label;
        const option = options.find((opt) => opt.value === value);
        return option?.label || label;
      }
    };

    return (
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            ref={forwardedRef}
            type="button"
            className={`flex h-10 items-center gap-2 whitespace-nowrap bg-transparent px-3 py-2 text-white transition-colors hover:opacity-80 ${className ?? ''}`}
            {...props}
          >
            <Icon size={18} className="flex-shrink-0 text-white" />
            <span className="font-medium text-sm text-white">
              {getDisplayText()}
            </span>
            <MdOutlineKeyboardArrowDown
              size={12}
              className="ml-0.5 flex-shrink-0 text-white"
            />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="PopoverContent z-50 w-[280px] rounded-lg bg-background-dark p-4 shadow-xl"
            side="bottom"
            align="start"
            sideOffset={5}
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="mb-3 font-medium text-gray-300 text-sm">
              {label}
            </div>

            <div className="relative mb-4">
              {multiple ? (
                <MultiSelectDropdown
                  options={options}
                  value={Array.isArray(tempValue) ? tempValue : []}
                  onValueChange={(values) => setTempValue(values)}
                  placeholder={placeholder}
                  searchable={
                    labelKey === 'filterPrimaryLanguage' ||
                    labelKey === 'filterTargetLanguage' ||
                    labelKey === 'filterCountry' ||
                    labelKey === 'filterTimezone'
                  }
                />
              ) : (
                <Dropdown
                  variant="default"
                  options={options}
                  value={typeof tempValue === 'string' ? tempValue : ''}
                  onValueChange={(val) => setTempValue(val)}
                  placeholder={placeholder}
                  searchable={
                    labelKey === 'filterPrimaryLanguage' ||
                    labelKey === 'filterTargetLanguage' ||
                    labelKey === 'filterCountry' ||
                    labelKey === 'filterTimezone'
                  }
                  showCheckmark={false}
                  fullWidth={true}
                />
              )}
            </div>

            <div className="flex justify-end gap-2 border-gray-700 border-t pt-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="px-4 py-2 text-sm"
              >
                {t('filterCancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleApply}
                className="px-4 py-2 text-sm"
              >
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

// Internal component for individual multi-select items to handle truncation logic
const MultiSelectItem = ({
  option,
  isSelected,
  isTabSelected,
  onToggle,
  onRef,
}: {
  option: { label: string; value: string };
  isSelected: boolean;
  isTabSelected: boolean;
  onToggle: () => void;
  onRef: (node: HTMLDivElement | null) => void;
}) => {
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (el) {
      // Check if the span is smaller than its scroll width (content width)
      setIsTruncated(el.scrollWidth > el.clientWidth + 0.5);
    }
  }, [option.label]);

  return (
    <Tooltip
      content={isTruncated ? option.label : undefined}
      side="right"
      delayDuration={300}
    >
      <div
        ref={onRef}
        onClick={onToggle}
        className={`dropdown-item relative flex min-h-8 w-full cursor-pointer select-none items-center overflow-hidden rounded pr-4 pl-4 text-sm text-white transition-colors hover:bg-primary-darker ${
          isTabSelected ? 'bg-primary-darker' : ''
        } ${isSelected ? 'bg-background-main text-primary-light' : ''}`}
      >
        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          {isSelected && (
            <MdCheck size={18} className="flex-shrink-0 text-primary" />
          )}
          {/* Text needs to be block/inline-block with truncate to properly measure overflow */}
          <span ref={textRef} className="block w-full truncate">
            {option.label}
          </span>
        </div>
      </div>
    </Tooltip>
  );
};

type MultiSelectDropdownProps = {
  options: { label: string; value: string }[];
  value: string[];
  onValueChange: (values: string[]) => void;
  placeholder?: string;
  searchable?: boolean;
};

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  value,
  onValueChange,
  placeholder,
  searchable = false,
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [animationKey, setAnimationKey] = useState(0);

  // Incremental rendering state for smooth animations
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);

  // Scroll Indicators State
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [searchBoxHeight, setSearchBoxHeight] = useState(0);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Progressive Loading Effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let timeoutId: NodeJS.Timeout;

    if (open) {
      setAnimationKey((prev) => prev + 1);
      // Reset to small batch immediately for smooth opening animation
      setVisibleCount(INITIAL_BATCH);

      // Wait for the opening animation to finish (approx 300ms)
      // Then start streaming in the rest of the items in chunks
      timeoutId = setTimeout(() => {
        intervalId = setInterval(() => {
          setVisibleCount((prev) => {
            if (prev >= options.length) {
              clearInterval(intervalId);
              return prev;
            }
            return prev + CHUNK_SIZE;
          });
        }, CHUNK_INTERVAL_MS);
      }, 300);
    } else {
      // Reset when closed
      setVisibleCount(INITIAL_BATCH);
    }

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [open, options.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setSearchTerm('');
        setSelectedIndex(null);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [open]);

  // Scroll Detection Logic
  useEffect(() => {
    if (!open) {
      setCanScrollUp(false);
      setCanScrollDown(false);
      return;
    }

    const checkScroll = () => {
      const viewport = listRef.current;
      if (!viewport) return;

      const { scrollTop, scrollHeight, clientHeight } = viewport;
      setCanScrollUp(scrollTop > 5);
      setCanScrollDown(scrollTop < scrollHeight - clientHeight - 5);
    };

    // Check immediately and then after a delay to account for layout shifts
    checkScroll();
    const timeoutId = setTimeout(checkScroll, 100);

    const viewport = listRef.current;
    if (viewport) {
      viewport.addEventListener('scroll', checkScroll);
    }

    return () => {
      clearTimeout(timeoutId);
      if (viewport) {
        viewport.removeEventListener('scroll', checkScroll);
      }
    };
  }, [open, visibleCount, searchTerm]); // Re-run when list grows or filters change

  // Measure search box height
  useLayoutEffect(() => {
    if (searchable && searchBoxRef.current) {
      setSearchBoxHeight(searchBoxRef.current.offsetHeight);
    } else {
      setSearchBoxHeight(0);
    }
  }, [searchable, open]);

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchTerm) {
      return options;
    }
    const lowerSearch = searchTerm.toLowerCase();

    const scoredOptions = options
      .map((option) => {
        const lowerLabel = option.label.toLowerCase();
        const searchIndex = lowerLabel.indexOf(lowerSearch);

        if (searchIndex === -1) return null;

        let score = 0;
        if (searchIndex === 0 && lowerLabel.length === lowerSearch.length) {
          score = 1000;
        } else if (searchIndex === 0) {
          score = 500;
        } else if (
          lowerLabel[searchIndex - 1] === ' ' ||
          lowerLabel[searchIndex - 1] === '-'
        ) {
          score = 300;
        } else {
          score = 100;
        }
        score += (1000 - lowerLabel.length) / 10;

        return { option, score, searchIndex };
      })
      .filter(
        (
          item,
        ): item is {
          option: (typeof options)[0];
          score: number;
          searchIndex: number;
        } => item !== null,
      );

    scoredOptions.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.option.label.localeCompare(b.option.label);
    });

    return scoredOptions.map((item) => item.option);
  }, [options, searchTerm, searchable]);

  const visibleOptions = useMemo(() => {
    if (searchable && searchTerm) {
      return filteredOptions;
    }
    return filteredOptions.slice(0, visibleCount);
  }, [filteredOptions, visibleCount, searchable, searchTerm]);

  const toggleValue = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onValueChange(value.filter((v) => v !== optionValue));
    } else {
      onValueChange([...value, optionValue]);
    }
  };

  const getDisplayText = () => {
    if (value.length === 0) return placeholder || 'Select...';
    if (value.length === 1) {
      const option = options.find((opt) => opt.value === value[0]);
      return option?.label || placeholder || 'Select...';
    }
    return `${value.length} selected`;
  };

  useEffect(() => {
    if (selectedIndex !== null && filteredOptions[selectedIndex]) {
      const selectedOption = filteredOptions[selectedIndex];
      if (itemRefs.current.has(selectedOption.value)) {
        const itemElement = itemRefs.current.get(selectedOption.value);
        if (itemElement) {
          setTimeout(() => {
            itemElement.scrollIntoView({
              block: 'nearest',
              behavior: 'smooth',
            });
          }, 0);
        }
      }
    }
  }, [selectedIndex, filteredOptions]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) {
            setSearchTerm('');
            setSelectedIndex(null);
          }
        }}
        className="flex h-12 w-full items-center justify-between whitespace-nowrap rounded-lg border border-gray-600 bg-background-darker p-3 text-white placeholder-gray-500 transition-colors"
      >
        <span className="min-w-0 flex-1 truncate text-left">
          {getDisplayText()}
        </span>
        <MdOutlineKeyboardArrowDown
          size={20}
          className={`ml-2 flex-shrink-0 text-white transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          key={`dropdown-${animationKey}`}
          className="dropdown-menu-animated absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-gray-700 bg-background-dark shadow-xl"
        >
          {searchable && (
            <div className="border-gray-700 border-b p-2" ref={searchBoxRef}>
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={
                    selectedIndex !== null && visibleOptions[selectedIndex]
                      ? visibleOptions[selectedIndex].label
                      : searchTerm
                  }
                  onChange={(e) => {
                    setSelectedIndex(null);
                    setSearchTerm(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      if (filteredOptions.length > 0) {
                        if (e.shiftKey) {
                          if (selectedIndex === null || selectedIndex === 0) {
                            setSelectedIndex(filteredOptions.length - 1);
                          } else {
                            setSelectedIndex(selectedIndex - 1);
                          }
                        } else {
                          if (
                            selectedIndex === null ||
                            selectedIndex === filteredOptions.length - 1
                          ) {
                            setSelectedIndex(0);
                          } else {
                            setSelectedIndex(selectedIndex + 1);
                          }
                        }
                      }
                      return;
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (
                        selectedIndex !== null &&
                        filteredOptions[selectedIndex]
                      ) {
                        toggleValue(filteredOptions[selectedIndex].value);
                      }
                      return;
                    }
                    if (
                      selectedIndex !== null &&
                      e.key.length === 1 &&
                      !e.ctrlKey &&
                      !e.metaKey &&
                      !e.altKey
                    ) {
                      e.preventDefault();
                      setSelectedIndex(null);
                      setSearchTerm(e.key);
                      setTimeout(() => {
                        if (searchInputRef.current) {
                          const len = searchInputRef.current.value.length;
                          searchInputRef.current.setSelectionRange(len, len);
                        }
                      }, 0);
                      return;
                    }
                  }}
                  placeholder="Search..."
                  className="h-8 w-full rounded bg-background-darker pr-2 pl-2 text-sm text-white placeholder-gray-500"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Up Chevron */}
          {canScrollUp && (
            <div
              className="pointer-events-auto absolute right-0 left-0 z-10 flex items-center justify-center bg-gradient-to-b from-background-dark via-background-dark/80 to-transparent pt-2 pb-2 text-white"
              style={{ top: `${searchBoxHeight}px` }}
              onClick={(e) => {
                e.preventDefault();
                listRef.current?.scrollBy({ top: -100, behavior: 'smooth' });
              }}
            >
              <MdKeyboardArrowUp size={20} />
            </div>
          )}

          <div
            className="max-h-[250px] overflow-y-auto p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            ref={listRef}
          >
            {visibleOptions.length > 0 ? (
              <>
                {visibleOptions.map((option, index) => (
                  <MultiSelectItem
                    key={option.value}
                    option={option}
                    isSelected={value.includes(option.value)}
                    isTabSelected={selectedIndex === index}
                    onToggle={() => toggleValue(option.value)}
                    onRef={(node) => {
                      if (node) {
                        itemRefs.current.set(option.value, node);
                      } else {
                        itemRefs.current.delete(option.value);
                      }
                    }}
                  />
                ))}
                {visibleCount < filteredOptions.length && (
                  <div className="h-8 w-full" aria-hidden="true" />
                )}
              </>
            ) : (
              <div className="flex h-12 items-center justify-center text-gray-500 text-sm">
                {searchable && searchTerm ? 'No results found' : 'No options'}
              </div>
            )}
          </div>

          {/* Down Chevron */}
          {canScrollDown && (
            <div
              className="pointer-events-auto absolute right-0 bottom-0 left-0 z-10 flex items-center justify-center bg-gradient-to-t from-background-dark via-background-dark/80 to-transparent py-2 text-white"
              onClick={(e) => {
                e.preventDefault();
                listRef.current?.scrollBy({ top: 100, behavior: 'smooth' });
              }}
            >
              <MdKeyboardArrowDown size={20} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

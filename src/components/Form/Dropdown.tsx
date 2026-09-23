import * as SelectPrimitive from '@radix-ui/react-select';
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
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdOutlineKeyboardArrowDown,
  MdOutlineKeyboardArrowUp,
  MdSearch,
} from 'react-icons/md';
import { SelectItem } from './SelectItem';

export type DropdownVariant = 'default' | 'minimal';

export type DropdownProps = Omit<
  SelectPrimitive.SelectProps,
  'onValueChange'
> & {
  variant?: DropdownVariant;
  options: { label: string; value: string }[];
  placeholder?: string;
  className?: string;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
  error?: boolean;
  fullWidth?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  icon?: IconType;
  label?: string;
  showCheckmark?: boolean;
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  onValueChange?: (value: string) => void;
};

const INITIAL_BATCH = 20;
const CHUNK_SIZE = 50;
const CHUNK_INTERVAL_MS = 16;

export const Dropdown = React.forwardRef<HTMLButtonElement, DropdownProps>(
  (
    {
      variant = 'default',
      options,
      placeholder,
      className,
      onBlur,
      error,
      fullWidth = false,
      searchable = false,
      searchPlaceholder,
      icon: Icon,
      label,
      showCheckmark = true,
      align = 'start',
      sideOffset = 5,
      onValueChange,
      value,
      ...props
    },
    forwardedRef,
  ) => {
    const t = useTranslations('Dropdown');
    const isMinimalVariant = variant === 'minimal';
    const isDefaultVariant = variant === 'default';
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);

    const viewportRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchBoxRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [canScrollUp, setCanScrollUp] = useState(false);
    const [canScrollDown, setCanScrollDown] = useState(false);
    const [searchBoxHeight, setSearchBoxHeight] = useState(0);

    const selectedOption = useMemo(
      () => options.find((opt) => opt.value === value),
      [options, value],
    );

    useEffect(() => {
      let intervalId: NodeJS.Timeout;
      let timeoutId: NodeJS.Timeout;

      if (open) {
        setVisibleCount(INITIAL_BATCH);

        // Wait for opening animation to complete (300ms)
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
        setVisibleCount(INITIAL_BATCH);
      }

      return () => {
        clearTimeout(timeoutId);
        clearInterval(intervalId);
      };
    }, [open, options.length]);

    useLayoutEffect(() => {
      if (open) {
        if (viewportRef.current) {
          viewportRef.current.scrollTop = 0;
        }

        if (searchable && searchInputRef.current) {
          requestAnimationFrame(() => {
            searchInputRef.current?.focus({ preventScroll: true });
          });
        }
      }
    }, [open, searchable]);

    useLayoutEffect(() => {
      if (open && viewportRef.current) {
        if (viewportRef.current.scrollTop < 20) {
          viewportRef.current.scrollTop = 0;
        }
      }
    }, [open]);

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

    useEffect(() => {
      if (!open) {
        setCanScrollUp(false);
        setCanScrollDown(false);
        return;
      }

      const checkScroll = () => {
        const viewport = viewportRef.current;
        if (!viewport) return;

        const { scrollTop, scrollHeight, clientHeight } = viewport;
        setCanScrollUp(scrollTop > 5);
        setCanScrollDown(scrollTop < scrollHeight - clientHeight - 5);
      };

      checkScroll();
      // Re-check after the animation/loading settles
      const timeoutId = setTimeout(checkScroll, 350);

      const viewport = viewportRef.current;
      if (viewport) {
        viewport.addEventListener('scroll', checkScroll);
      }

      return () => {
        clearTimeout(timeoutId);
        if (viewport) {
          viewport.removeEventListener('scroll', checkScroll);
        }
      };
    }, [open]);

    useEffect(() => {
      if (searchable && searchBoxRef.current) {
        setSearchBoxHeight(searchBoxRef.current.offsetHeight);
      } else {
        setSearchBoxHeight(0);
      }
    }, [searchable]);

    useEffect(() => {
      if (searchable) {
        setSelectedIndex(null);
      }
    }, [searchable]);

    useEffect(() => {
      if (
        selectedIndex !== null &&
        filteredOptions[selectedIndex] &&
        viewportRef.current
      ) {
        const selectedOption = filteredOptions[selectedIndex];
        if (itemRefs.current.has(selectedOption.value)) {
          const itemElement = itemRefs.current.get(selectedOption.value);
          if (itemElement) {
            setTimeout(() => {
              itemElement.scrollIntoView({
                block: 'nearest',
                behavior: 'smooth',
                inline: 'nearest',
              });
            }, 0);
          }
        }
      }
    }, [selectedIndex, filteredOptions]);

    const widthClass = fullWidth ? 'w-full' : '';

    const triggerClasses = isMinimalVariant
      ? `flex h-10 items-center gap-2 whitespace-nowrap bg-transparent px-3 py-2 text-foreground transition-colors hover:opacity-80 ${className ?? ''}`
      : `flex h-12 ${widthClass} items-center justify-between gap-2 whitespace-nowrap rounded-xl border bg-background-darker px-4 text-[15px] text-foreground outline-none transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:outline-none data-[placeholder]:text-subtle ${error ? 'border-red-500' : 'border-line hover:border-line-strong data-[state=open]:border-line-strong'} ${className ?? ''}`;

    const chevronSize = isMinimalVariant ? 12 : 20;
    const ChevronDown = isMinimalVariant
      ? MdKeyboardArrowDown
      : MdOutlineKeyboardArrowDown;
    const ChevronUp = isMinimalVariant
      ? MdKeyboardArrowUp
      : MdOutlineKeyboardArrowUp;
    const contentWidthStyle = { width: 'var(--radix-select-trigger-width)' };

    return (
      <SelectPrimitive.Root
        {...props}
        // Keep Radix controlled without selecting an item so it cannot restore stale internal selection.
        value=""
        defaultValue={undefined}
        open={open}
        onOpenChange={setOpen}
      >
        <SelectPrimitive.Trigger
          ref={forwardedRef}
          className={triggerClasses}
          aria-label={label || placeholder || 'Selection'}
          onBlur={onBlur}
        >
          {isMinimalVariant && Icon && (
            <Icon size={18} className="flex-shrink-0 text-foreground" />
          )}

          {isMinimalVariant && label ? (
            <span className="font-medium text-foreground text-sm">{label}</span>
          ) : (
            <span
              className={
                isDefaultVariant ? 'min-w-0 flex-1 truncate text-left' : ''
              }
            >
              {selectedOption ? selectedOption.label : placeholder || ''}
            </span>
          )}

          <SelectPrimitive.Icon
            className={
              isMinimalVariant
                ? 'ml-0.5 flex-shrink-0 text-foreground'
                : `flex-shrink-0 text-subtle transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'rotate-180' : ''}`
            }
          >
            <ChevronDown size={chevronSize} />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="SelectContent relative z-50 overflow-hidden rounded-2xl border border-gray-500/50 bg-background-dark shadow-lg"
            position="popper"
            align={align}
            sideOffset={sideOffset}
            style={contentWidthStyle}
            side="bottom"
            collisionPadding={8}
            onCloseAutoFocus={(e) => {
              if (searchable) {
                e.preventDefault();
              }
            }}
            onKeyDown={(e) => {
              if (searchable) {
                const isInputFocused =
                  document.activeElement === searchInputRef.current;
                if (isInputFocused) {
                  if (
                    ![
                      'ArrowDown',
                      'ArrowUp',
                      'Enter',
                      'Escape',
                      'Tab',
                      'Home',
                      'End',
                    ].includes(e.key) &&
                    !e.ctrlKey &&
                    !e.metaKey &&
                    !e.altKey
                  ) {
                    e.stopPropagation();
                    e.preventDefault();
                  }
                }
              }
            }}
          >
            {searchable && (
              <div ref={searchBoxRef} className="p-1.5">
                <div className="relative">
                  <MdSearch
                    size={18}
                    className="-translate-y-1/2 absolute top-1/2 left-3 text-subtle"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSelectedIndex(null);
                      setSearchTerm(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (document.activeElement === searchInputRef.current) {
                        e.stopPropagation();
                      }
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (visibleOptions.length > 0) {
                          onValueChange?.(visibleOptions[0].value);
                          setSearchTerm('');
                          setOpen(false);
                        }
                      }
                    }}
                    placeholder={searchPlaceholder}
                    className="h-[38px] w-full rounded-full border border-line bg-background-darker pr-3.5 pl-[34px] text-foreground text-sm placeholder-subtle outline-none transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-line-strong focus:border-line-strong focus:outline-none"
                  />
                </div>
              </div>
            )}

            {canScrollUp && (
              <button
                type="button"
                className="pointer-events-auto absolute right-0 left-0 z-10 flex items-center justify-center bg-gradient-to-b from-background-dark via-background-dark/80 to-transparent pt-2 pb-2 text-foreground"
                style={{ top: `${searchBoxHeight - 8}px` }}
                onClick={(e) => {
                  e.preventDefault();
                  viewportRef.current?.scrollBy({
                    top: -100,
                    behavior: 'smooth',
                  });
                }}
              >
                <ChevronUp size={20} />
              </button>
            )}

            <SelectPrimitive.Viewport
              className={`relative flex max-h-60 w-full flex-col gap-0.5 overflow-y-auto p-1.5 ${searchable ? 'pt-0' : ''}`}
              ref={viewportRef}
            >
              {visibleOptions.length > 0 ? (
                <>
                  {visibleOptions.map((option, index) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      title={option.label}
                      showCheckmark={showCheckmark}
                      isSelected={value === option.value}
                      tabSelected={selectedIndex === index}
                      onPointerUp={() => {
                        onValueChange?.(option.value);
                        setOpen(false);
                        setSearchTerm('');
                      }}
                      ref={(node) => {
                        if (node) itemRefs.current.set(option.value, node);
                        else itemRefs.current.delete(option.value);
                      }}
                      onMouseEnter={() => {
                        if (searchable) searchInputRef.current?.focus();
                      }}
                      onFocus={(e) => {
                        if (searchable && searchInputRef.current) {
                          e.preventDefault();
                          requestAnimationFrame(() =>
                            searchInputRef.current?.focus(),
                          );
                        }
                      }}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                  {visibleCount < filteredOptions.length && (
                    <div className="h-8 w-full" aria-hidden="true" />
                  )}
                </>
              ) : (
                <div className="flex h-12 items-center justify-center text-sm text-subtle">
                  {searchable && searchTerm ? t('noResults') : t('noOptions')}
                </div>
              )}
            </SelectPrimitive.Viewport>

            {canScrollDown && (
              <button
                type="button"
                className="pointer-events-auto absolute right-0 bottom-0 left-0 z-10 flex items-center justify-center bg-gradient-to-t from-background-dark via-background-dark/80 to-transparent py-2 text-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  viewportRef.current?.scrollBy({
                    top: 100,
                    behavior: 'smooth',
                  });
                }}
              >
                <ChevronDown size={20} />
              </button>
            )}
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    );
  },
);

Dropdown.displayName = 'Dropdown';

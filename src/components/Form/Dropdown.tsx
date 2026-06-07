import * as SelectPrimitive from '@radix-ui/react-select';
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

// Batch configuration for progressive rendering
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
    const isMinimalVariant = variant === 'minimal';
    const isDefaultVariant = variant === 'default';
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    // Incremental rendering state
    const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);

    const viewportRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchBoxRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [canScrollUp, setCanScrollUp] = useState(false);
    const [canScrollDown, setCanScrollDown] = useState(false);
    const [searchBoxHeight, setSearchBoxHeight] = useState(0);

    // Look up the selected option object based on the current value.
    const selectedOption = useMemo(
      () => options.find((opt) => opt.value === value),
      [options, value],
    );

    // Progressive Loading Logic
    useEffect(() => {
      let intervalId: NodeJS.Timeout;
      let timeoutId: NodeJS.Timeout;

      if (open) {
        // Reset to initial batch on open
        setVisibleCount(INITIAL_BATCH);

        // Wait for opening animation to complete (300ms)
        timeoutId = setTimeout(() => {
          // Stream remaining items in chunks to avoid blocking main thread
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

    // FOCUS SEARCH & RESET SCROLL:
    // This runs ONCE when the dropdown opens.
    // It forces the scroll to 0 and locks focus to the search bar.
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

    // FORCE TOP POSITION (Safety Net):
    // This runs every time the list grows (chunks load).
    // If the browser tries to be "smart" and scroll down as new items appear, we slap it back to 0.
    useLayoutEffect(() => {
      if (open && viewportRef.current) {
        // Only force if we are near the top. This allows user to scroll down manually if they are fast.
        if (viewportRef.current.scrollTop < 20) {
          viewportRef.current.scrollTop = 0;
        }
      }
    }, [open]);

    // Filter and sort options
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

    // Derived visible options
    const visibleOptions = useMemo(() => {
      if (searchable && searchTerm) {
        return filteredOptions;
      }
      return filteredOptions.slice(0, visibleCount);
    }, [filteredOptions, visibleCount, searchable, searchTerm]);

    // Check scroll position
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

    // Measure search box height
    useEffect(() => {
      if (searchable && searchBoxRef.current) {
        setSearchBoxHeight(searchBoxRef.current.offsetHeight);
      } else {
        setSearchBoxHeight(0);
      }
    }, [searchable]);

    // Reset selected index when search term changes
    useEffect(() => {
      if (searchable) {
        setSelectedIndex(null);
      }
    }, [searchable]);

    // Scroll selected item into view (only for keyboard navigation)
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
      ? `flex h-10 items-center gap-2 whitespace-nowrap bg-transparent px-3 py-2 text-white transition-colors hover:opacity-80 ${className ?? ''}`
      : `flex h-12 ${widthClass} items-center justify-between whitespace-nowrap rounded-lg border bg-background-darker p-3 text-white placeholder-gray-500 transition-colors data-[placeholder]:text-gray-500 ${error ? 'border-red-500' : 'border-gray-600'} ${className ?? ''}`;

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
        // CRITICAL FIX: We must pass an empty string here.
        // If we pass undefined, Radix becomes "uncontrolled" and remembers internal state.
        // If we pass "", it becomes "controlled" to a value that doesn't exist.
        // This forces Radix to have total amnesia about what is selected, preventing auto-scroll.
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
            <Icon size={18} className="flex-shrink-0 text-white" />
          )}

          {isMinimalVariant && label ? (
            <span className="font-medium text-sm text-white">{label}</span>
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
            className={`flex-shrink-0 text-white ${isMinimalVariant ? 'ml-0.5' : 'ml-2'}`}
          >
            <ChevronDown size={chevronSize} />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="SelectContent relative z-50 overflow-hidden rounded-md bg-background-dark shadow-xl"
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
              <div ref={searchBoxRef} className="border-gray-700 border-b p-2">
                <div className="relative">
                  <MdSearch
                    size={18}
                    className="-translate-y-1/2 absolute top-1/2 left-2 text-gray-400"
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
                    className="h-8 w-full rounded bg-background-darker pr-2 pl-8 text-sm text-white placeholder-gray-500"
                  />
                </div>
              </div>
            )}

            {canScrollUp && (
              <button
                type="button"
                className="pointer-events-auto absolute right-0 left-0 z-10 flex items-center justify-center bg-gradient-to-b from-background-dark via-background-dark/80 to-transparent pt-2 pb-2 text-white"
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
              className="relative max-h-[400px] w-full overflow-y-auto p-1"
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
                      // Manually handle visual selection
                      isSelected={value === option.value}
                      tabSelected={selectedIndex === index}
                      // Manually handle logic since Root is oblivious
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
                <div className="flex h-12 items-center justify-center text-gray-500 text-sm">
                  {searchable && searchTerm ? 'No results found' : 'No options'}
                </div>
              )}
            </SelectPrimitive.Viewport>

            {canScrollDown && (
              <button
                type="button"
                className="pointer-events-auto absolute right-0 bottom-0 left-0 z-10 flex items-center justify-center bg-gradient-to-t from-background-dark via-background-dark/80 to-transparent py-2 text-white"
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

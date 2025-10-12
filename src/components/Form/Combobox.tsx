import * as PopoverPrimitive from '@radix-ui/react-popover';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTranslations } from 'next-intl';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MdCheck } from 'react-icons/md';

export type ComboboxProps = {
  placeholder?: string;
  options: { label: string; value: string }[];
  className?: string;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onValueChange: (value: string) => void;
  value: string;
  name?: string;
};

export const Combobox = React.forwardRef<HTMLInputElement, ComboboxProps>(
  (
    { placeholder, options, className, onBlur, onValueChange, value, name },
    forwardedRef,
  ) => {
    const t = useTranslations('Combobox');
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [loading, setLoading] = useState(false);

    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const selectedOption = options.find((option) => option.value === value);
      const newLabel = selectedOption?.label || '';
      setInputValue(newLabel);
      setSearchTerm(newLabel);
    }, [value, options]);

    useEffect(() => {
      if (inputValue === searchTerm) {
        return;
      }
      const timer = setTimeout(() => {
        setSearchTerm(inputValue);
        setLoading(false); // Turn off loading after search term is updated
      }, 200);

      return () => clearTimeout(timer);
    }, [inputValue, searchTerm]);

    const filterOptions = useCallback(
      (search: string, opts: typeof options) => {
        if (
          !search ||
          search === options.find((opt) => opt.value === value)?.label
        ) {
          return opts;
        }
        const lowerSearch = search.toLowerCase();
        return opts.filter((option) =>
          option.label.toLowerCase().includes(lowerSearch),
        );
      },
      [value, options.find],
    );

    const filteredOptions = useMemo(
      () => filterOptions(searchTerm, options),
      [searchTerm, options, filterOptions],
    );

    useEffect(() => {
      setHighlightedIndex(0);
    }, []);

    const rowVirtualizer = useVirtualizer({
      count: filteredOptions.length,
      getScrollElement: () => listRef.current,
      estimateSize: () => 32,
      overscan: 5,
    });

    useEffect(() => {
      if (open && highlightedIndex >= 0) {
        rowVirtualizer.scrollToIndex(highlightedIndex, { align: 'auto' });
      }
    }, [highlightedIndex, open, rowVirtualizer]);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      setInputValue(newValue);
      setOpen(!!newValue);
      if (newValue) {
        setLoading(true); // Turn on loading immediately on input
      } else {
        setLoading(false);
        onValueChange('');
      }
    };

    const handleInputFocus = () => {
      if (inputValue) {
        setOpen(true);
      }
    };

    const handleSelect = (selectedValue: string) => {
      onValueChange(selectedValue);
      const selectedLabel =
        options.find((option) => option.value === selectedValue)?.label || '';
      setInputValue(selectedLabel);
      setOpen(false);
    };

    const handleInputBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      setOpen(false);
      const match = options.find(
        (option) => option.label.toLowerCase() === inputValue.toLowerCase(),
      );

      if (match) {
        if (match.value !== value) {
          onValueChange(match.value);
        }
        setInputValue(match.label);
      } else {
        const selectedOption = options.find((option) => option.value === value);
        setInputValue(selectedOption?.label || '');
      }

      onBlur?.(event);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open) return;

      const { key } = event;
      const optionsLength = filteredOptions.length;

      if (key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }

      // Prevent keyboard navigation while results are loading
      if (optionsLength > 0 && !loading) {
        switch (key) {
          case 'ArrowDown':
            event.preventDefault();
            setHighlightedIndex((prev) => (prev + 1) % optionsLength);
            break;
          case 'ArrowUp':
            event.preventDefault();
            setHighlightedIndex(
              (prev) => (prev - 1 + optionsLength) % optionsLength,
            );
            break;
          case 'Enter':
          case 'Tab':
            event.preventDefault();
            handleSelect(filteredOptions[highlightedIndex].value);
            break;
        }
      } else if (key === 'Enter') {
        event.preventDefault();
      }
    };

    return (
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Anchor asChild>
          <div
            className={`flex h-12 w-full items-center justify-between rounded-lg border border-gray-600 bg-background-darker p-3 text-white placeholder-gray-500 transition-colors focus-within:border-primary focus-within:ring-primary data-[placeholder]:text-gray-500 ${className}`}
          >
            <input
              ref={forwardedRef}
              name={name}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              placeholder={placeholder}
              className="w-full bg-transparent text-white placeholder-gray-500 focus:outline-none"
              autoComplete="off"
            />
          </div>
        </PopoverPrimitive.Anchor>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            className="z-50 mt-1 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-md bg-background-dark shadow-xl"
            sideOffset={5}
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div ref={listRef} className="max-h-64 overflow-y-auto p-1">
              {loading ? (
                <div className="flex h-12 items-center justify-center text-gray-500 text-sm">
                  {t('loading')}
                </div>
              ) : filteredOptions.length > 0 ? (
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                    const option = filteredOptions[virtualItem.index];
                    return (
                      <button
                        type="button"
                        key={option.value}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualItem.size}px`,
                          transform: `translateY(${virtualItem.start}px)`,
                        }}
                        data-highlighted={
                          virtualItem.index === highlightedIndex
                            ? ''
                            : undefined
                        }
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelect(option.value);
                        }}
                        onMouseEnter={() =>
                          setHighlightedIndex(virtualItem.index)
                        }
                        className="relative flex h-8 items-center rounded px-4 pl-8 text-left text-sm text-white hover:bg-primary-darker focus:outline-none data-[highlighted]:bg-background-main data-[highlighted]:text-primary-light"
                      >
                        {option.label}
                        {value === option.value && (
                          <span className="absolute left-0 inline-flex w-8 items-center justify-center">
                            <MdCheck size={18} className="text-primary" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-12 items-center justify-center text-gray-500 text-sm">
                  {t('noResults')}
                </div>
              )}
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    );
  },
);

Combobox.displayName = 'Combobox';

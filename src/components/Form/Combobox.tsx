import * as PopoverPrimitive from '@radix-ui/react-popover';
import React, { useCallback, useMemo, useState } from 'react';
import { MdCheck } from 'react-icons/md';
import { ScrollArea } from './ScrollArea';

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
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState(
      options.find((option) => option.value === value)?.label || '',
    );

    React.useEffect(() => {
      const selectedOption = options.find((option) => option.value === value);
      setInputValue(selectedOption?.label || '');
    }, [value, options]);

    const filterOptions = useCallback(
      (search: string, opts: typeof options) => {
        if (!search) return opts;
        const lowerSearch = search.toLowerCase();
        return opts.filter((option) =>
          option.label.toLowerCase().includes(lowerSearch),
        );
      },
      [],
    );

    const filteredOptions = useMemo(
      () => filterOptions(inputValue, options),
      [inputValue, options, filterOptions],
    );

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      setInputValue(newValue);
      if (newValue) {
        setOpen(true);
      } else {
        setOpen(false);
        onValueChange('');
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

      if (onBlur) {
        onBlur(event);
      }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Tab' && open && filteredOptions.length > 0) {
        event.preventDefault();
        handleSelect(filteredOptions[0].value);
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
            <ScrollArea className="p-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(option.value);
                    }}
                    className="relative flex h-8 w-full cursor-pointer select-none items-center rounded px-4 pl-8 text-left text-sm text-white hover:bg-primary-darker focus:outline-none data-[highlighted]:bg-background-main data-[highlighted]:text-primary-light"
                  >
                    {option.label}
                    {value === option.value && (
                      <span className="absolute left-0 inline-flex w-8 items-center justify-center">
                        <MdCheck size={18} className="text-primary" />
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div className="flex h-12 items-center justify-center text-gray-500 text-sm">
                  No results found.
                </div>
              )}
            </ScrollArea>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    );
  },
);

Combobox.displayName = 'Combobox';

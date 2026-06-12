import * as SelectPrimitive from '@radix-ui/react-select';
import React from 'react';
import {
  MdOutlineKeyboardArrowDown,
  MdOutlineKeyboardArrowUp,
} from 'react-icons/md';
import { SelectItem } from './SelectItem';

export type SelectProps = SelectPrimitive.SelectProps & {
  placeholder?: string;
  options: { label: string; value: string }[];
  className?: string;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
  error?: boolean;
  ariaLabel?: string;
};

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    { placeholder, options, className, onBlur, error, ariaLabel, ...props },
    forwardedRef,
  ) => {
    const hasWidthClass = className?.match(/\bw-|min-w-|max-w-/);
    const widthClass = hasWidthClass ? '' : 'w-full';

    return (
      <SelectPrimitive.Root {...props}>
        <SelectPrimitive.Trigger
          ref={forwardedRef}
          className={`group flex h-12 ${widthClass} items-center justify-between gap-2 whitespace-nowrap rounded-xl border bg-background-darker px-4 text-left text-[15px] text-white outline-none transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:outline-none data-[placeholder]:text-gray-500 ${
            error
              ? 'border-red-500'
              : 'border-white/[0.07] hover:border-white/[0.14] data-[state=open]:border-white/[0.14]'
          } ${className ?? ''}`}
          aria-label={ariaLabel}
          onBlur={onBlur}
        >
          <SelectPrimitive.Value
            placeholder={placeholder}
            className="min-w-0 flex-1 truncate"
          />
          <SelectPrimitive.Icon className="flex-shrink-0 text-gray-500 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[state=open]:rotate-180">
            <MdOutlineKeyboardArrowDown size={20} />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="SelectContent z-50 overflow-hidden rounded-2xl border border-gray-500/50 bg-background-dark shadow-lg"
            position="popper"
            sideOffset={6}
            style={{ width: 'var(--radix-select-trigger-width)' }}
          >
            <SelectPrimitive.ScrollUpButton className="flex items-center justify-center bg-background-dark text-white">
              <MdOutlineKeyboardArrowUp size={20} />
            </SelectPrimitive.ScrollUpButton>

            <SelectPrimitive.Viewport className="flex max-h-60 w-full flex-col gap-0.5 overflow-y-auto p-1.5">
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectPrimitive.Viewport>

            <SelectPrimitive.ScrollDownButton className="flex items-center justify-center bg-background-dark text-white">
              <MdOutlineKeyboardArrowDown size={20} />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    );
  },
);

Select.displayName = 'Select';

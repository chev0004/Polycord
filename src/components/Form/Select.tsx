import * as SelectPrimitive from '@radix-ui/react-select';
import React from 'react';
import {
  MdCheck,
  MdOutlineKeyboardArrowDown,
  MdOutlineKeyboardArrowUp,
} from 'react-icons/md';
import { ScrollArea } from './ScrollArea';

type SelectItemProps = SelectPrimitive.SelectItemProps & {
  children: React.ReactNode;
};

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ children, className, ...props }, forwardedRef) => {
    return (
      <SelectPrimitive.Item
        className={`relative flex h-8 select-none items-center rounded px-4 pl-8 text-sm text-white hover:bg-primary-darker focus:outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-background-main data-[disabled]:text-gray-500 data-[highlighted]:text-primary-light ${className}`}
        {...props}
        ref={forwardedRef}
      >
        <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
        <SelectPrimitive.ItemIndicator className="absolute left-0 inline-flex w-8 items-center justify-center">
          <MdCheck size={18} className="text-primary" />
        </SelectPrimitive.ItemIndicator>
      </SelectPrimitive.Item>
    );
  },
);
SelectItem.displayName = 'SelectItem';

export type SelectProps = SelectPrimitive.SelectProps & {
  placeholder?: string;
  options: { label: string; value: string }[];
  className?: string;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
  error?: boolean;
};

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    { placeholder, options, className, onBlur, error, ...props },
    forwardedRef,
  ) => {
    const hasWidthClass = className?.match(/\bw-|min-w-|max-w-/);
    const widthClass = hasWidthClass ? '' : 'w-full';

    return (
      <SelectPrimitive.Root {...props}>
        <SelectPrimitive.Trigger
          ref={forwardedRef}
          className={`flex h-12 ${widthClass} items-center justify-between whitespace-nowrap rounded-lg border bg-background-darker p-3 text-white placeholder-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-darker data-[placeholder]:text-gray-500 ${
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-600 focus:ring-primary'
          } ${className ?? ''}`}
          aria-label="Selection"
          onBlur={onBlur}
        >
          <SelectPrimitive.Value
            placeholder={placeholder}
            className="flex-1 whitespace-nowrap"
          />
          <SelectPrimitive.Icon className="ml-2 flex-shrink-0 text-white">
            <MdOutlineKeyboardArrowDown size={20} />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="SelectContent z-50 overflow-hidden rounded-md bg-background-dark shadow-xl"
            position="popper"
            sideOffset={5}
            style={{ width: 'var(--radix-select-trigger-width)' }}
          >
            <SelectPrimitive.ScrollUpButton className="flex items-center justify-center bg-background-dark text-white">
              <MdOutlineKeyboardArrowUp size={20} />
            </SelectPrimitive.ScrollUpButton>

            <ScrollArea className="p-1">
              <SelectPrimitive.Viewport>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectPrimitive.Viewport>
            </ScrollArea>

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

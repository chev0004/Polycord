import * as SelectPrimitive from '@radix-ui/react-select';
import React, { useLayoutEffect, useRef, useState } from 'react';
import { MdCheck } from 'react-icons/md';
import { Tooltip } from '@/components/Tooltip';

type SelectItemProps = SelectPrimitive.SelectItemProps & {
  children: React.ReactNode;
  showCheckmark?: boolean;
  tabSelected?: boolean;
  title?: string;
  /**
   * If provided, manually controls the selection state visual (checkmark).
   * This bypasses Radix's context-based ItemIndicator.
   */
  isSelected?: boolean;
};

export const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  (
    {
      children,
      className,
      showCheckmark = true,
      tabSelected = false,
      title,
      isSelected,
      ...props
    },
    forwardedRef,
  ) => {
    const [isTruncated, setIsTruncated] = useState(false);
    const textRef = useRef<HTMLSpanElement>(null);

    useLayoutEffect(() => {
      const el = textRef.current;
      if (el) {
        // A small buffer (0.5) handles sub-pixel rounding differences
        setIsTruncated(el.scrollWidth > el.clientWidth + 0.5);
      }
    });

    return (
      <Tooltip
        content={isTruncated ? title : undefined}
        side="right"
        align="center"
        delayDuration={300}
      >
        <SelectPrimitive.Item
          className={`flex min-h-10 w-full cursor-pointer select-none items-center justify-between gap-2 rounded-full px-3 text-foreground text-sm transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-background-main hover:text-primary-light data-[disabled]:pointer-events-none data-[highlighted]:bg-background-main data-[disabled]:text-subtle data-[highlighted]:text-primary-light ${tabSelected ? 'bg-background-main text-primary-light' : ''} ${className ?? ''}`}
          data-tab-selected={tabSelected}
          {...props}
          ref={forwardedRef}
        >
          <span ref={textRef} className="min-w-0 flex-1 truncate">
            <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
          </span>

          {showCheckmark && (
            <>
              {isSelected !== undefined && isSelected && (
                <span className="inline-flex flex-shrink-0 items-center justify-center">
                  <MdCheck size={18} className="text-primary" />
                </span>
              )}

              {isSelected === undefined && (
                <SelectPrimitive.ItemIndicator className="inline-flex flex-shrink-0 items-center justify-center">
                  <MdCheck size={18} className="text-primary" />
                </SelectPrimitive.ItemIndicator>
              )}
            </>
          )}
        </SelectPrimitive.Item>
      </Tooltip>
    );
  },
);

SelectItem.displayName = 'SelectItem';

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
    const paddingClass = showCheckmark ? 'pl-6' : 'pl-4';
    const [isTruncated, setIsTruncated] = useState(false);
    const localRef = useRef<HTMLDivElement>(null);

    const handleRef = (node: HTMLDivElement | null) => {
      localRef.current = node;

      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    };

    useLayoutEffect(() => {
      const el = localRef.current;
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
          className={`relative flex min-h-8 w-full cursor-pointer select-none items-center truncate rounded ${paddingClass} pr-4 text-sm text-white hover:bg-primary-darker data-[disabled]:pointer-events-none data-[highlighted]:bg-background-main data-[disabled]:text-gray-500 data-[highlighted]:text-primary-light ${tabSelected ? 'bg-primary-darker' : ''} ${className ?? ''}`}
          data-tab-selected={tabSelected}
          {...props}
          ref={handleRef}
        >
          <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>

          {showCheckmark && (
            <>
              {isSelected !== undefined && isSelected && (
                <span className="absolute left-1 inline-flex w-5 items-center justify-center">
                  <MdCheck size={18} className="text-primary" />
                </span>
              )}

              {isSelected === undefined && (
                <SelectPrimitive.ItemIndicator className="absolute left-1 inline-flex w-5 items-center justify-center">
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

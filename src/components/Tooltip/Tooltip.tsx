'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type React from 'react';

type TooltipProps = {
  children: React.ReactNode;
  content?: string | React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
};

export const Tooltip = ({
  children,
  content,
  side = 'right',
  align = 'center',
  delayDuration = 200,
}: TooltipProps) => {
  if (!content) return <>{children}</>;

  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={5}
            className="TooltipContent z-[100] max-w-[300px] overflow-hidden rounded-md border border-gray-500/50 bg-background-darker px-3 py-1.5 font-figtree font-medium text-white text-xs shadow-md"
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-gray-500/50" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
};

import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import React from 'react';

export const ScrollArea = React.forwardRef<
  HTMLDivElement,
  ScrollAreaPrimitive.ScrollAreaViewportProps
>(({ children, className, ...props }, forwardedRef) => (
  <ScrollAreaPrimitive.Root className="h-auto overflow-hidden rounded-md">
    <ScrollAreaPrimitive.Viewport
      {...props}
      ref={forwardedRef}
      className={`h-full max-h-[400px] w-full rounded-[inherit] ${className}`}
    >
      <div className="pr-2">{children}</div>
    </ScrollAreaPrimitive.Viewport>
    <ScrollAreaPrimitive.Scrollbar
      className="flex w-2 touch-none select-none p-px transition-colors data-[orientation=horizontal]:h-2 data-[orientation=vertical]:w-2"
      orientation="vertical"
    >
      <ScrollAreaPrimitive.Thumb className="before:-translate-x-1/2 before:-translate-y-1/2 relative flex-1 rounded-full bg-primary-darker before:absolute before:top-1/2 before:left-1/2 before:h-full before:min-h-11 before:w-full before:min-w-11" />
    </ScrollAreaPrimitive.Scrollbar>
    <ScrollAreaPrimitive.Corner className="bg-background-darker" />
  </ScrollAreaPrimitive.Root>
));

ScrollArea.displayName = 'ScrollArea';

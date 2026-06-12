import * as Switch from '@radix-ui/react-switch';
import React from 'react';

const Toggle = React.forwardRef<
  React.ComponentRef<typeof Switch.Root>,
  React.ComponentPropsWithoutRef<typeof Switch.Root>
>(({ className, ...props }, ref) => (
  <Switch.Root
    className={`relative h-6 w-11 cursor-pointer rounded-full bg-primary-dark transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-discord-blue ${className ?? ''}`}
    {...props}
    ref={ref}
  >
    <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.5)] transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] data-[state=checked]:translate-x-[22px]" />
  </Switch.Root>
));

Toggle.displayName = Switch.Root.displayName;

export { Toggle };

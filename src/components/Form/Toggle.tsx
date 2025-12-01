import * as Switch from '@radix-ui/react-switch';
import React from 'react';

const Toggle = React.forwardRef<
  React.ComponentRef<typeof Switch.Root>,
  React.ComponentPropsWithoutRef<typeof Switch.Root>
>(({ className, ...props }, ref) => (
  <Switch.Root
    className={`relative h-6 w-11 cursor-pointer rounded-full bg-primary-dark transition-colors data-[state=checked]:bg-discord-blue ${className ?? ''}
    `}
    {...props}
    ref={ref}
  >
    <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-[22px]" />
  </Switch.Root>
));

Toggle.displayName = Switch.Root.displayName;

export { Toggle };

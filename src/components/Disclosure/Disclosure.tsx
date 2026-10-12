'use client';

import {
  type ButtonHTMLAttributes,
  type ReactNode,
  useId,
  useState,
} from 'react';
import { MdExpandMore } from 'react-icons/md';

type DisclosureProps = {
  title: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerClassName?: string;
  headerProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  children: ReactNode;
};

export const Disclosure = ({
  title,
  defaultOpen = false,
  className,
  headerClassName,
  headerProps,
  children,
}: DisclosureProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();

  return (
    <div className={className}>
      <button
        type="button"
        {...headerProps}
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={(event) => {
          headerProps?.onClick?.(event);
          if (!event.defaultPrevented) setOpen(!open);
        }}
        className={`flex w-full items-center justify-between gap-2 text-left ${headerClassName ?? ''}`}
      >
        <span>{title}</span>
        <MdExpandMore
          size={18}
          aria-hidden
          className={`shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        id={bodyId}
        className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div inert={!open} className="overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};

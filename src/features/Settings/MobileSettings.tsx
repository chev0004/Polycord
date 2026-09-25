import type { ReactNode } from 'react';
import { MdChevronLeft } from 'react-icons/md';

export const SettingsGroup = ({ children }: { children: ReactNode }) => (
  <div className="overflow-hidden rounded-3xl bg-background-dark">
    {children}
  </div>
);

export const SettingsToggleRow = ({
  label,
  description,
  children,
}: {
  label: ReactNode;
  description: ReactNode;
  children: ReactNode;
}) => (
  <div className="relative flex min-h-14 items-center gap-3.5 px-4 py-2.5 before:absolute before:top-0 before:right-0 before:left-4 before:h-px before:bg-line first:before:hidden">
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="flex items-center gap-2 font-semibold text-[15px]">
        {label}
      </span>
      <span className="text-[13px] text-subtle leading-snug">
        {description}
      </span>
    </div>
    {children}
  </div>
);

export const SettingsPushPage = ({
  title,
  backLabel,
  animate,
  onBack,
  children,
}: {
  title: string;
  backLabel: string;
  animate: boolean;
  onBack: () => void;
  children: ReactNode;
}) => (
  <div
    className={
      animate
        ? 'motion-safe:animate-[pushIn_0.38s_cubic-bezier(0.16,1,0.3,1)]'
        : undefined
    }
  >
    <div className="relative flex min-h-12 items-center px-2">
      <button
        type="button"
        onClick={onBack}
        className="flex h-11 items-center pr-2.5 font-semibold text-[15px] text-primary hover:text-primary-light focus-visible:text-primary-light"
      >
        <MdChevronLeft size={26} aria-hidden />
        {backLabel}
      </button>
      <h1 className="-translate-x-1/2 pointer-events-none absolute left-1/2 font-bold text-base">
        {title}
      </h1>
    </div>
    <div className="flex flex-col gap-3 px-4 pt-2 pb-8">{children}</div>
  </div>
);

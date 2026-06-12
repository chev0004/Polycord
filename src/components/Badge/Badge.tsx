import type { ReactNode } from 'react';

type BadgeProps = {
  children: ReactNode;
  variant?: 'positive' | 'neutral';
  className?: string;
};

const variants = {
  positive: 'bg-green-500/20 text-green-400',
  neutral: 'bg-gray-500/20 text-gray-400',
};

export const Badge = ({
  children,
  variant = 'positive',
  className,
}: BadgeProps) => (
  <span
    className={`inline-flex items-center rounded-md px-2.5 py-[3px] font-figtree font-semibold text-xs ${variants[variant]} ${className ?? ''}`}
  >
    {children}
  </span>
);

import type { HTMLAttributes, ReactNode } from 'react';

type BadgeProps = {
  children: ReactNode;
  variant?: 'positive' | 'neutral';
} & HTMLAttributes<HTMLSpanElement>;

const variants = {
  positive: 'bg-green-500/20 text-green-400',
  neutral: 'bg-gray-500/20 text-gray-400',
};

export const Badge = ({
  children,
  variant = 'neutral',
  className,
  ...props
}: BadgeProps) => (
  <span
    {...props}
    className={`inline-flex rounded-md px-2 py-0.5 font-semibold text-xs ${variants[variant]} ${className ?? ''}`}
  >
    {children}
  </span>
);

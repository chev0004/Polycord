import type { HTMLAttributes, ReactNode } from 'react';
import { MdClose } from 'react-icons/md';

type ChipProps = {
  children: ReactNode;
  withDot?: boolean;
  onRemove?: () => void;
  removeLabel?: string;
} & HTMLAttributes<HTMLSpanElement>;

export const Chip = ({
  children,
  withDot = true,
  onRemove,
  removeLabel,
  className,
  ...props
}: ChipProps) => {
  const fallbackRemoveLabel =
    typeof children === 'string' || typeof children === 'number'
      ? `Remove ${children}`
      : 'Remove';

  return (
    <span
      {...props}
      className={`inline-flex items-center gap-1.5 rounded-md bg-primary-darker px-2.5 py-1 ${className ?? ''}`}
    >
      {withDot ? (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-dark" />
      ) : null}
      <span className="font-medium text-primary-light text-xs">{children}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="-mr-0.5 flex text-primary-light transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={removeLabel ?? fallbackRemoveLabel}
        >
          <MdClose size={14} aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
};

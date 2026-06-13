import { MdClose } from 'react-icons/md';

type ChipRemoveProps =
  | { onRemove: () => void; removeLabel: string }
  | { onRemove?: undefined; removeLabel?: undefined };

type ChipProps = {
  label: string;
  withDot?: boolean;
  onClick?: () => void;
  className?: string;
} & ChipRemoveProps;

const baseClasses =
  'inline-flex items-center gap-1.5 rounded-md bg-[var(--ct-chip-bg,var(--color-primary-darker))] px-[9px] py-[3px]';

export const Chip = ({
  label,
  withDot = true,
  onClick,
  onRemove,
  removeLabel,
  className,
}: ChipProps) => {
  const content = (
    <>
      {withDot && (
        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--ct-chip-dot,var(--color-primary-dark))]" />
      )}
      <span className="font-medium text-[var(--ct-chip-text,var(--color-primary-light))] text-xs">
        {label}
      </span>
    </>
  );

  if (onRemove) {
    return (
      <span className={`${baseClasses} ${className ?? ''}`}>
        {content}
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="flex text-primary-light transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-white"
        >
          <MdClose size={16} />
        </button>
      </span>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClasses} cursor-pointer transition-opacity hover:opacity-80 active:opacity-60 ${className ?? ''}`}
      >
        {content}
      </button>
    );
  }

  return <span className={`${baseClasses} ${className ?? ''}`}>{content}</span>;
};

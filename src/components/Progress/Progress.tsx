type ProgressProps = {
  value?: number;
  max?: number;
  'aria-label': string;
  className?: string;
};

export const Progress = ({
  value,
  max = 100,
  className,
  ...props
}: ProgressProps) => (
  <div
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={max}
    aria-valuenow={value}
    className={`h-2 w-full overflow-hidden rounded-full bg-primary-darker ${className ?? ''}`}
    {...props}
  >
    {value === undefined ? (
      <div className="progress-indeterminate h-full w-full rounded-full" />
    ) : (
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
      />
    )}
  </div>
);

'use client';

import { MdAdd, MdRemove } from 'react-icons/md';

const SIZES = {
  sm: { height: 'h-[34px]', button: 'w-[34px]', text: 'text-[13px]' },
  md: { height: 'h-10', button: 'w-10', text: 'text-sm' },
  lg: { height: 'h-12', button: 'w-12', text: 'text-[17px] font-semibold' },
};

export type NumberStepperProps = {
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  decrementLabel: string;
  incrementLabel: string;
  label?: string;
  id?: string;
  size?: keyof typeof SIZES;
  error?: boolean;
  disabled?: boolean;
  className?: string;
};

const stepButton =
  'grid shrink-0 place-items-center text-muted outline-none transition-colors hover:text-foreground focus-visible:text-foreground disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:text-muted';

export const NumberStepper = ({
  value,
  onChange,
  min,
  max,
  decrementLabel,
  incrementLabel,
  label,
  id,
  size = 'md',
  error = false,
  disabled = false,
  className,
}: NumberStepperProps) => {
  const current = Number(value);
  const hasValue = value !== '' && Number.isInteger(current);
  const step = (delta: number) =>
    onChange(
      String(hasValue ? Math.max(min, Math.min(max, current + delta)) : min),
    );
  const { height, button, text } = SIZES[size];
  const border = error
    ? 'border-red-500'
    : 'border-line hover:border-line-strong focus-within:border-line-strong';

  return (
    <div
      className={`inline-flex items-center rounded-field border bg-background-darker transition-colors duration-200 ${height} ${border} ${disabled ? 'opacity-50' : ''} ${className ?? ''}`}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label={decrementLabel}
        disabled={disabled || (hasValue && current <= min)}
        onClick={() => step(-1)}
        className={`${stepButton} ${button} h-full`}
      >
        <MdRemove size={18} />
      </button>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        role="spinbutton"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={hasValue ? current : undefined}
        aria-invalid={error || undefined}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
          event.preventDefault();
          step(event.key === 'ArrowUp' ? 1 : -1);
        }}
        className={`h-full min-w-0 flex-1 bg-transparent text-center text-foreground tabular-nums outline-none disabled:cursor-not-allowed ${text}`}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={incrementLabel}
        disabled={disabled || (hasValue && current >= max)}
        onClick={() => step(1)}
        className={`${stepButton} ${button} h-full`}
      >
        <MdAdd size={18} />
      </button>
    </div>
  );
};

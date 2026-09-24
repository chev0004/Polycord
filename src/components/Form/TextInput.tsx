import React from 'react';

export type TextInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

export const textFieldClasses = (error?: boolean, readOnly?: boolean) => {
  const border = error
    ? 'border-red-500 hover:border-red-500 focus:border-red-500'
    : readOnly
      ? 'border-line hover:border-line focus:border-line'
      : 'border-line hover:border-line-strong focus:border-line-strong';
  const text = readOnly ? 'cursor-not-allowed text-muted' : 'text-foreground';

  return `w-full rounded-xl border bg-background-darker placeholder-subtle outline-none transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:outline-none disabled:cursor-not-allowed disabled:text-muted disabled:opacity-50 ${border} ${text}`;
};

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ error = false, readOnly, className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      readOnly={readOnly}
      aria-invalid={error || undefined}
      aria-describedby={error && props.id ? `${props.id}-error` : undefined}
      className={`h-12 px-4 text-[15px] ${textFieldClasses(error, readOnly)} ${className ?? ''}`}
      {...props}
    />
  ),
);

TextInput.displayName = 'TextInput';

import React from 'react';

export type TextInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

export const textFieldClasses = (error?: boolean, readOnly?: boolean) => {
  const border = error
    ? 'border-red-500 hover:border-red-500 focus:border-red-500'
    : readOnly
      ? 'border-white/[0.07] hover:border-white/[0.07] focus:border-white/[0.07]'
      : 'border-white/[0.07] hover:border-white/[0.14] focus:border-white/[0.14]';
  const text = readOnly ? 'cursor-not-allowed text-gray-400' : 'text-white';

  return `w-full rounded-xl border bg-background-darker placeholder-gray-500 outline-none transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:outline-none ${border} ${text}`;
};

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ error = false, readOnly, className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      readOnly={readOnly}
      className={`h-12 px-4 text-[15px] ${textFieldClasses(error, readOnly)} ${className ?? ''}`}
      {...props}
    />
  ),
);

TextInput.displayName = 'TextInput';

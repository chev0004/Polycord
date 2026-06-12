import type React from 'react';

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  // Kept for API compatibility: validation messages communicate
  // requirements instead of an asterisk.
  required?: boolean;
};

export const Label: React.FC<LabelProps> = ({
  children,
  htmlFor,
  required: _required = false,
  className,
  ...props
}) => (
  <label
    htmlFor={htmlFor}
    className={`block font-medium text-[13px] text-gray-400 ${className ?? ''}`}
    {...props}
  >
    {children}
  </label>
);

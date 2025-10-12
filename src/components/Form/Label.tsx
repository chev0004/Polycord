import type React from 'react';

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  required?: boolean;
};

export const Label: React.FC<LabelProps> = ({
  children,
  htmlFor,
  required = false,
  className,
  ...props
}) => (
  <label
    htmlFor={htmlFor}
    className={`mb-1 block font-semibold text-sm text-white ${className ?? ''}`}
    {...props}
  >
    {children}
    {required && <span className="ml-1 text-red-500">*</span>}
  </label>
);

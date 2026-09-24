import type React from 'react';

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
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
    className={`block font-medium text-[13px] text-muted ${className ?? ''}`}
    {...props}
  >
    {children}
  </label>
);

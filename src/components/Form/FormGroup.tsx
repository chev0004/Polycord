import type React from 'react';

type FormGroupProps = React.HTMLAttributes<HTMLDivElement> & {
  row?: boolean;
};

export const FormGroup: React.FC<FormGroupProps> = ({
  children,
  className = '',
  row = false,
  ...props
}) => (
  <div
    className={`flex ${
      row ? 'flex-row items-center justify-between gap-6' : 'flex-col gap-[7px]'
    } ${className}`}
    {...props}
  >
    {children}
  </div>
);

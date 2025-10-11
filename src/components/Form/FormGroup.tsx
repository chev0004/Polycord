import type React from 'react';

export const FormGroup: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`flex flex-col gap-1 ${className}`} {...props}>
    {children}
  </div>
);

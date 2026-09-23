import type React from 'react';

type FieldErrorProps = {
  children?: React.ReactNode;
};

export const FieldError: React.FC<FieldErrorProps> = ({ children }) =>
  children ? (
    <p role="alert" className="text-danger text-xs">
      {children}
    </p>
  ) : null;

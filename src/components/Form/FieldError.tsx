import type React from 'react';

type FieldErrorProps = {
  children?: React.ReactNode;
};

export const FieldError: React.FC<FieldErrorProps> = ({ children }) =>
  children ? (
    <p role="alert" className="text-red-500 text-xs">
      {children}
    </p>
  ) : null;

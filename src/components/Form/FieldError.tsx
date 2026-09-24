import type React from 'react';

type FieldErrorProps = {
  id?: string;
  children?: React.ReactNode;
};

export const FieldError: React.FC<FieldErrorProps> = ({ id, children }) =>
  children ? (
    <p id={id} role="alert" className="text-danger text-xs">
      {children}
    </p>
  ) : null;

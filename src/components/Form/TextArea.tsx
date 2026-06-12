import React from 'react';
import { textFieldClasses } from './TextInput';

export type TextAreaProps =
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    error?: boolean;
  };

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ error = false, readOnly, className, rows = 4, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      readOnly={readOnly}
      className={`min-h-32 resize-none px-4 py-[13px] font-light text-[14.5px] leading-[1.55] ${textFieldClasses(error, readOnly)} ${className ?? ''}`}
      {...props}
    />
  ),
);

TextArea.displayName = 'TextArea';

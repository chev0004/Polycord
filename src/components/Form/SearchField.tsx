'use client';

import { useTranslations } from 'next-intl';
import React, { useImperativeHandle, useRef } from 'react';
import { MdClose, MdSearch } from 'react-icons/md';

export type SearchFieldProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'className'
> & {
  value: string;
  onClear: () => void;
  className?: string;
  inputClassName?: string;
  iconSize?: number;
};

export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  (
    { value, onClear, className, inputClassName, iconSize = 20, ...props },
    ref,
  ) => {
    const t = useTranslations('SearchField');
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    return (
      <label
        className={`flex items-center gap-2 rounded-full border bg-background-darker text-subtle ${className ?? ''}`}
      >
        <MdSearch size={iconSize} aria-hidden className="shrink-0" />
        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          value={value}
          className={`min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-subtle ${inputClassName ?? ''}`}
          {...props}
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              onClear();
              inputRef.current?.focus();
            }}
            aria-label={t('clear')}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-background-main hover:text-foreground focus-visible:bg-background-main focus-visible:text-foreground"
          >
            <MdClose size={18} />
          </button>
        ) : null}
      </label>
    );
  },
);

SearchField.displayName = 'SearchField';

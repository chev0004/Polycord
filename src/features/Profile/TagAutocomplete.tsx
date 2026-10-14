'use client';

import * as Popover from '@radix-ui/react-popover';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { MdAdd } from 'react-icons/md';
import { TextInput } from '@/components/Form';
import {
  fetchTagSuggestions,
  type TagSuggestion,
} from './tagSuggestionsRequest';

const MIN_TAG_LENGTH = 2;
const MAX_TAG_LENGTH = 20;
const SEARCH_DELAY_MS = 200;

type Suggestions =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; tags: TagSuggestion[] };

type CachedSuggestions = {
  at: number;
  request: Promise<TagSuggestion[]>;
  tags?: TagSuggestion[];
};

type TagOption = { tag: string; count: number; create: boolean };

type TagAutocompleteProps = {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  selected: string[];
  onAdd: (tag: string) => void;
  placeholder: string;
  error?: boolean;
};

const optionClasses =
  'flex min-h-10 w-full items-center justify-between gap-2 rounded-full px-3 text-left text-foreground text-sm transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] data-[highlighted]:bg-background-main data-[highlighted]:text-primary-light max-md:min-h-11';

const statusClasses = 'px-3 py-2.5 text-sm text-subtle';

export const TagAutocomplete = ({
  id,
  value,
  onValueChange,
  selected,
  onAdd,
  placeholder,
  error,
}: TagAutocompleteProps) => {
  const t = useTranslations('Profile');
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const cache = useRef(new Map<string, CachedSuggestions>());
  const [result, setResult] = useState<{ key: string; value: Suggestions }>();
  const query = value.trim().toLowerCase();
  const excluded = JSON.stringify(
    [...new Set(selected.map((tag) => tag.toLowerCase()))].sort(),
  );
  const key = JSON.stringify([query, excluded]);
  const entry = cache.current.get(key);
  const cached =
    entry && (!entry.tags || Date.now() - entry.at < 60_000)
      ? entry
      : undefined;
  const suggestions: Suggestions = cached?.tags
    ? { status: 'ready', tags: cached.tags }
    : result?.key === key
      ? result.value
      : { status: 'loading' };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(
      () => {
        let entry = cache.current.get(key);
        if (entry?.tags && Date.now() - entry.at >= 60_000) entry = undefined;
        if (!entry) {
          if (cache.current.size >= 64)
            cache.current.delete(cache.current.keys().next().value as string);
          const request = fetchTagSuggestions(query, JSON.parse(excluded));
          entry = { at: Date.now(), request };
          cache.current.set(key, entry);
          const stored = entry;
          request
            .then((tags) => {
              stored.tags = tags;
              stored.at = Date.now();
            })
            .catch(() => cache.current.delete(key));
        }
        entry.request
          .then((tags) => {
            if (cancelled) return;
            setResult({ key, value: { status: 'ready', tags } });
            setHighlighted(0);
          })
          .catch(() => {
            if (!cancelled) setResult({ key, value: { status: 'error' } });
          });
      },
      cache.current.has(key) || !query ? 0 : SEARCH_DELAY_MS,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query, excluded, key]);

  const lowered = query.toLowerCase();
  const tags = suggestions.status === 'ready' ? suggestions.tags : [];
  const creatable =
    suggestions.status !== 'loading' &&
    query.length >= MIN_TAG_LENGTH &&
    query.length <= MAX_TAG_LENGTH &&
    !tags.some(({ tag }) => tag.toLowerCase() === lowered) &&
    !selected.some((tag) => tag.toLowerCase() === lowered);
  const options: TagOption[] = [
    ...tags.map(({ tag, count }) => ({ tag, count, create: false })),
    ...(creatable ? [{ tag: value.trim(), count: 0, create: true }] : []),
  ];
  const activeOption = options[highlighted];
  useEffect(() => {
    if (open && activeOption)
      document
        .getElementById(`${listboxId}-${highlighted}`)
        ?.scrollIntoView({ block: 'nearest' });
  }, [open, activeOption, highlighted, listboxId]);
  const statusMessage =
    suggestions.status === 'loading'
      ? t('tagSuggestionsLoading')
      : suggestions.status === 'error'
        ? t('tagSuggestionsError')
        : tags.length === 0
          ? t(query ? 'tagSuggestionsNoMatch' : 'tagSuggestionsEmpty')
          : null;

  const choose = (option: TagOption) => {
    onAdd(option.tag);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setHighlighted(
        (current) =>
          (current + step + options.length) % Math.max(options.length, 1),
      );
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'Tab') {
      setOpen(false);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (open && activeOption) choose(activeOption);
      else if (!(open && query && suggestions.status === 'loading'))
        onAdd(value);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <TextInput
          ref={inputRef}
          id={id}
          value={value}
          onChange={(event) => {
            onValueChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1"
          error={error}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open && options.length > 0 ? listboxId : undefined}
          aria-activedescendant={
            open && activeOption ? `${listboxId}-${highlighted}` : undefined
          }
          autoComplete="off"
        />
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          className="PopoverContent z-50 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-list border border-gray-500/50 bg-background-dark p-1.5 shadow-lg"
          sideOffset={6}
          align="start"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            if (event.target === inputRef.current) event.preventDefault();
          }}
        >
          {statusMessage ? (
            <output className={`block ${statusClasses}`}>
              {statusMessage}
            </output>
          ) : query ? null : (
            <p className="px-3 pt-1.5 pb-1 font-semibold text-[11px] text-subtle uppercase tracking-wide">
              {t('tagSuggestionsPopular')}
            </p>
          )}
          {options.length > 0 ? (
            <div
              id={listboxId}
              role="listbox"
              aria-label={t('tagSuggestionsLabel')}
              className="max-h-60 overflow-y-auto"
            >
              {options.map((option, index) => (
                <button
                  key={option.create ? `create:${option.tag}` : option.tag}
                  type="button"
                  role="option"
                  id={`${listboxId}-${index}`}
                  aria-selected={index === highlighted}
                  tabIndex={-1}
                  data-highlighted={index === highlighted ? '' : undefined}
                  className={optionClasses}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    choose(option);
                  }}
                  onMouseEnter={() => setHighlighted(index)}
                >
                  {option.create ? (
                    <span className="flex min-w-0 items-center gap-2">
                      <MdAdd size={18} aria-hidden className="shrink-0" />
                      <span className="truncate">
                        {t('tagCreate', { tag: option.tag })}
                      </span>
                    </span>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate">
                        {option.tag}
                      </span>
                      <span className="shrink-0 text-subtle text-xs">
                        ({option.count})
                      </span>
                    </>
                  )}
                </button>
              ))}
            </div>
          ) : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

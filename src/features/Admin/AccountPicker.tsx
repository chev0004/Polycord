'use client';

import { useTranslations } from 'next-intl';
import { type KeyboardEvent, useEffect, useId, useState } from 'react';
import { MdClose, MdSearch } from 'react-icons/md';
import { Avatar } from '@/components/Avatar';
import { Spinner } from './ModerationParts';
import type { ModUser } from './types';
import type { ModerationStore } from './useModeration';

type Status = 'idle' | 'loading' | 'ready' | 'error';

export const AccountPicker = ({
  store,
  value,
  onChange,
  placeholder,
  label,
}: {
  store: ModerationStore;
  value: string | null;
  onChange: (userId: string | null) => void;
  placeholder: string;
  label: string;
}) => {
  const t = useTranslations('Admin');
  const listId = useId();
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [attempt, setAttempt] = useState(0);
  const [active, setActive] = useState(0);
  const { search, usersById } = store;
  const selected = value ? usersById.get(value) : undefined;
  const candidates = matches.flatMap((id) => {
    const user = usersById.get(id);
    return user && !user.role ? [user] : [];
  });
  const open = !selected && query.trim() !== '';

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt re-runs the search on retry
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || value) {
      setMatches([]);
      setStatus('idle');
      return;
    }
    setStatus('loading');
    let current = true;
    const timer = setTimeout(() => {
      search(trimmed)
        .then((ids) => {
          if (!current) return;
          setMatches(ids);
          setActive(0);
          setStatus('ready');
        })
        .catch(() => current && setStatus('error'));
    }, 300);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query, value, search, attempt]);

  const choose = (user: ModUser) => {
    setQuery('');
    onChange(user.id);
  };

  const clear = () => {
    setQuery('');
    onChange(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && (value || query)) {
      event.stopPropagation();
      clear();
    } else if (open && candidates.length) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActive((active + 1) % candidates.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActive((active - 1 + candidates.length) % candidates.length);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        choose(candidates[active]);
      }
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="flex h-10 items-center gap-2 rounded-full border border-white/[0.07] bg-background-darker pr-3 pl-3.5 text-subtle focus-within:border-white/[0.14]">
        <MdSearch size={18} aria-hidden />
        <input
          type="search"
          role="combobox"
          aria-expanded={open && status === 'ready' && candidates.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && candidates.length ? `${listId}-${active}` : undefined
          }
          value={selected ? selected.username : query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (value) onChange(null);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={label}
          className="min-w-0 flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-subtle"
        />
        {selected || query ? (
          <button type="button" onClick={clear} aria-label={t('clearSearch')}>
            <MdClose size={18} />
          </button>
        ) : null}
      </label>
      {selected ? (
        <div className="flex items-center gap-2.5 rounded-xl p-2">
          <Avatar avatarUrl={selected.avatarUrl} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-[13px] text-foreground">
              {selected.displayName}
            </p>
            <p className="truncate text-[11.5px] text-subtle">
              @{selected.username}
            </p>
          </div>
        </div>
      ) : null}
      {open && status === 'loading' ? (
        <output className="flex items-center gap-2 px-2 py-2 text-[13px] text-subtle">
          <Spinner />
          {t('searchingAccounts')}
        </output>
      ) : null}
      {open && status === 'error' ? (
        <p
          role="alert"
          className="flex items-center gap-2 px-2 py-2 text-[13px] text-red-400"
        >
          {t('accountSearchFailed')}
          <button
            type="button"
            onClick={() => setAttempt(attempt + 1)}
            className="font-semibold text-primary-light"
          >
            {t('retry')}
          </button>
        </p>
      ) : null}
      {open && status === 'ready' && !candidates.length ? (
        <output className="px-2 py-2 text-[13px] text-subtle">
          {t('noStaffMatches')}
        </output>
      ) : null}
      {open && status === 'ready' && candidates.length ? (
        <div id={listId} role="listbox" aria-label={label}>
          {candidates.map((user, index) => (
            <button
              key={user.id}
              id={`${listId}-${index}`}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={index === active}
              onClick={() => choose(user)}
              onMouseEnter={() => setActive(index)}
              className={`flex w-full items-center gap-2.5 rounded-xl p-2 text-left ${index === active ? 'bg-background-main' : ''}`}
            >
              <Avatar avatarUrl={user.avatarUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-[13px] text-foreground">
                  {user.displayName}
                </p>
                <p className="truncate text-[11.5px] text-subtle">
                  @{user.username}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

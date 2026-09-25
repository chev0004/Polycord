'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useState } from 'react';
import {
  MdArrowBack,
  MdArrowUpward,
  MdCheck,
  MdSearch,
  MdSwapVert,
  MdTune,
} from 'react-icons/md';
import { Button } from '@/components/Button';
import type { FilterConfig } from '@/components/Filter/FilterBar';
import {
  SEARCHABLE_THRESHOLD,
  toSelection,
} from '@/components/Filter/FilterButton';
import {
  ActionSheet,
  Sheet,
  SheetCheck,
  SheetGroup,
  SheetIconButton,
  SheetLabel,
  SheetRow,
  SheetTextButton,
} from '@/components/Sheet';
import type { DiscoveryFilterValues } from './discoveryFilters';
import type { DiscoverySortValue } from './discoverySort';
import type { DiscoveryTagCount } from './discoveryTags';
import { sortOptionLabelKeys } from './SortMenu';

export type FilterDraft = {
  filterValues: DiscoveryFilterValues;
  selectedTags: string[];
  sortValue: DiscoverySortValue;
};

const SECTIONS = [
  {
    key: 'languages',
    labelKey: 'filterSheetLanguages',
    ids: ['primaryLanguage', 'targetLanguage'],
  },
  { key: 'proficiency', labelKey: 'filterProficiency', ids: ['proficiency'] },
  {
    key: 'location',
    labelKey: 'filterSheetLocationTime',
    ids: ['country', 'timezone'],
  },
  {
    key: 'availability',
    labelKey: 'filterAvailability',
    ids: ['availability'],
  },
];

const FilterCount = ({ count }: { count: number }) => (
  <span className="inline-grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-[5px] font-bold text-[11px] text-on-primary">
    {count}
  </span>
);

const TextControl = ({
  active = false,
  icon,
  onClick,
  children,
}: {
  active?: boolean;
  icon: ReactNode;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex h-9 min-w-0 items-center gap-1.5 rounded-full px-2.5 font-semibold text-[13px] transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:bg-overlay active:scale-[0.97] ${
      active
        ? 'text-primary-light [&>svg]:text-primary-light'
        : 'text-soft [&>svg]:text-subtle'
    }`}
  >
    {icon}
    {children}
  </button>
);

const ToggleChip = ({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    aria-pressed={on}
    onClick={onClick}
    className={`inline-flex h-[38px] items-center gap-1.5 rounded-full border px-[13px] text-[13px] transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] ${
      on
        ? 'border-primary-dark bg-primary-darker font-semibold text-primary-light'
        : 'border-line text-soft focus-visible:border-primary-dark'
    }`}
  >
    {on ? <MdCheck size={16} aria-hidden /> : null}
    {children}
  </button>
);

export const BackToTop = ({ count }: { count: number }) => {
  const t = useTranslations('Discovery');
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const update = () => setShown(window.scrollY > 520);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      inert={!shown}
      aria-label={t('backToTop')}
      className={`fixed right-4 bottom-[calc(var(--dock-space,0px)+12px)] z-30 grid h-11 w-11 place-items-center rounded-full bg-background-darker text-soft shadow-[0_0_0_1px_var(--color-line-strong),0_10px_24px_-6px_rgba(0,0,0,0.75)] transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:text-foreground active:scale-[0.92] md:hidden ${
        shown
          ? ''
          : 'pointer-events-none translate-y-3.5 scale-[0.85] opacity-0'
      }`}
    >
      <MdArrowUpward size={22} aria-hidden />
      {count > 0 ? (
        <span className="-top-[3px] -right-[3px] absolute rounded-full ring-2 ring-background-darker">
          <FilterCount count={count} />
        </span>
      ) : null}
    </button>
  );
};

type SortSheetProps = {
  value: DiscoverySortValue;
  options: readonly DiscoverySortValue[];
  onChange: (value: DiscoverySortValue) => void;
};

export const SortSheet = ({ value, options, onChange }: SortSheetProps) => {
  const t = useTranslations('Discovery');
  const [open, setOpen] = useState(false);

  return (
    <>
      <TextControl
        icon={<MdSwapVert size={17} aria-hidden />}
        onClick={() => setOpen(true)}
      >
        <span className="sr-only">{t('sortByLabel')}: </span>
        <span className="truncate">{t(sortOptionLabelKeys[value])}</span>
      </TextControl>
      <ActionSheet
        open={open}
        onOpenChange={setOpen}
        title={t('sortByLabel')}
        radio
        items={options.map((option) => ({
          key: option,
          label: t(sortOptionLabelKeys[option]),
          selected: option === value,
          onSelect: () => onChange(option),
        }))}
      />
    </>
  );
};

type FilterSheetProps = {
  filters: FilterConfig[];
  tags: DiscoveryTagCount[];
  sortOptions: readonly DiscoverySortValue[];
  value: FilterDraft;
  onApply: (draft: FilterDraft) => void;
  countResults: (draft: FilterDraft, signal: AbortSignal) => Promise<number>;
};

export const FilterSheet = ({
  filters,
  tags,
  sortOptions,
  value,
  onApply,
  countResults,
}: FilterSheetProps) => {
  const t = useTranslations('Discovery');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [subpage, setSubpage] = useState<string | null>(null);
  const [drilled, setDrilled] = useState(false);
  const [search, setSearch] = useState('');
  const [count, setCount] = useState<number | null>(null);

  const appliedCount =
    Object.values(value.filterValues).reduce(
      (total, entry) => total + toSelection(entry).length,
      0,
    ) + value.selectedTags.length;

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setCount(null);
    const timer = setTimeout(() => {
      countResults(draft, controller.signal)
        .then(setCount)
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, draft, countResults]);

  const selection = (id: string) => toSelection(draft.filterValues[id]);

  const setSelection = (filter: FilterConfig, values: string[]) =>
    setDraft((previous) => ({
      ...previous,
      filterValues: {
        ...previous.filterValues,
        [filter.id]: filter.multiple ? values : (values[0] ?? ''),
      },
    }));

  const toggleOption = (filter: FilterConfig, option: string) => {
    const current = selection(filter.id);
    setSelection(
      filter,
      current.includes(option)
        ? current.filter((entry) => entry !== option)
        : filter.multiple
          ? [...current, option]
          : [option],
    );
  };

  const toggleTag = (tag: string) =>
    setDraft((previous) => ({
      ...previous,
      selectedTags: previous.selectedTags.includes(tag)
        ? previous.selectedTags.filter((entry) => entry !== tag)
        : [...previous.selectedTags, tag],
    }));

  const summary = (filter: FilterConfig) => {
    const selected = selection(filter.id);
    if (selected.length === 0) return t('filterSheetAny');
    if (selected.length > 2)
      return t('filterSheetSelected', { count: selected.length });
    return selected
      .map(
        (entry) =>
          filter.options.find((option) => option.value === entry)?.label ??
          entry,
      )
      .join(', ');
  };

  const hasDraftFilters =
    draft.selectedTags.length > 0 ||
    Object.values(draft.filterValues).some(
      (entry) => toSelection(entry).length > 0,
    );

  const subFilter = filters.find((filter) => filter.id === subpage);
  const activeSubFilter = drilled ? subFilter : undefined;
  const query = search.trim().toLowerCase();
  const subOptions = subFilter
    ? subFilter.options.filter((option) =>
        option.label.toLowerCase().includes(query),
      )
    : [];

  const openSheet = () => {
    setDraft(value);
    setDrilled(false);
    setOpen(true);
  };

  const drill = (id: string) => {
    setSubpage(id);
    setSearch('');
    setDrilled(true);
  };

  return (
    <>
      <TextControl
        active={appliedCount > 0}
        icon={<MdTune size={17} aria-hidden />}
        onClick={openSheet}
      >
        {t('filtersButton')}
        {appliedCount > 0 ? <FilterCount count={appliedCount} /> : null}
      </TextControl>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        full
        flush
        title={
          activeSubFilter ? t(activeSubFilter.labelKey) : t('filterSheetTitle')
        }
        leading={
          activeSubFilter ? (
            <SheetIconButton
              label={t('filterSheetBack')}
              onClick={() => setDrilled(false)}
            >
              <MdArrowBack size={24} />
            </SheetIconButton>
          ) : undefined
        }
        trailing={
          activeSubFilter ? (
            selection(activeSubFilter.id).length > 0 ? (
              <SheetTextButton
                onClick={() => setSelection(activeSubFilter, [])}
              >
                {t('filterSheetClear')}
              </SheetTextButton>
            ) : null
          ) : hasDraftFilters ? (
            <SheetTextButton
              onClick={() =>
                setDraft((previous) => ({
                  ...previous,
                  filterValues: {},
                  selectedTags: [],
                }))
              }
            >
              {t('filterSheetReset')}
            </SheetTextButton>
          ) : null
        }
        footer={
          <Button
            weight="semibold"
            disabled={count === 0}
            onClick={() => {
              onApply(draft);
              setOpen(false);
            }}
            className="h-[50px] flex-1 rounded-full text-[15px]"
          >
            {count === null
              ? t('filterSheetShowResults')
              : count === 0
                ? t('filterSheetNoMatches')
                : t('filterSheetShow', { count })}
          </Button>
        }
      >
        <div
          inert={drilled}
          className={`absolute inset-0 overflow-y-auto overscroll-contain px-5 pt-1 pb-5 transition-[transform,opacity] duration-[380ms] ease-[cubic-bezier(0.16,1,0.3,1)] [scrollbar-width:none] ${
            drilled ? '-translate-x-[28%] opacity-0' : ''
          }`}
        >
          <SheetLabel>{t('sortByLabel')}</SheetLabel>
          <div className="grid grid-cols-2 gap-2">
            {sortOptions.map((option) => {
              const on = draft.sortValue === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setDraft((previous) => ({ ...previous, sortValue: option }))
                  }
                  className={`flex h-11 min-w-0 items-center gap-2 rounded-xl border px-3 text-left text-sm transition-colors duration-200 ${
                    on
                      ? 'border-primary bg-primary-darker font-semibold text-primary-light'
                      : 'border-line text-soft focus-visible:border-primary-dark'
                  }`}
                >
                  <span className="truncate">
                    {t(sortOptionLabelKeys[option])}
                  </span>
                  <SheetCheck radio checked={on} />
                </button>
              );
            })}
          </div>

          {SECTIONS.map((section) => {
            const sectionFilters = filters.filter((filter) =>
              section.ids.includes(filter.id),
            );
            if (sectionFilters.length === 0) return null;
            const drillFilters = sectionFilters.filter(
              (filter) => filter.options.length > SEARCHABLE_THRESHOLD,
            );
            const chipFilters = sectionFilters.filter(
              (filter) => filter.options.length <= SEARCHABLE_THRESHOLD,
            );

            return (
              <div key={section.key}>
                <SheetLabel>{t(section.labelKey)}</SheetLabel>
                {drillFilters.length > 0 ? (
                  <SheetGroup>
                    {drillFilters.map((filter) => (
                      <SheetRow
                        key={filter.id}
                        icon={filter.icon}
                        label={t(filter.labelKey)}
                        value={summary(filter)}
                        valueActive={selection(filter.id).length > 0}
                        chevron
                        onClick={() => drill(filter.id)}
                      />
                    ))}
                  </SheetGroup>
                ) : null}
                {chipFilters.map((filter) => (
                  <div key={filter.id} className="flex flex-wrap gap-2">
                    {filter.options.map((option) => (
                      <ToggleChip
                        key={option.value}
                        on={selection(filter.id).includes(option.value)}
                        onClick={() => toggleOption(filter, option.value)}
                      >
                        {option.label}
                      </ToggleChip>
                    ))}
                  </div>
                ))}
              </div>
            );
          })}

          {tags.length > 0 ? (
            <>
              <SheetLabel
                aside={
                  draft.selectedTags.length > 0
                    ? t('filterSheetSelected', {
                        count: draft.selectedTags.length,
                      })
                    : undefined
                }
              >
                {t('filterSheetInterests')}
              </SheetLabel>
              <div className="flex flex-wrap gap-2">
                {tags.map(({ tag, count: tagCount }) => (
                  <ToggleChip
                    key={tag}
                    on={draft.selectedTags.includes(tag)}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                    <span className="text-subtle text-xs">({tagCount})</span>
                  </ToggleChip>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div
          inert={!drilled}
          className={`absolute inset-0 overflow-y-auto overscroll-contain bg-background-dark px-5 pt-1 pb-5 transition-transform duration-[380ms] ease-[cubic-bezier(0.16,1,0.3,1)] [scrollbar-width:none] ${
            drilled ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {subFilter ? (
            <>
              <div className="sticky top-0 z-[2] bg-background-dark pb-2.5">
                <label className="flex h-11 items-center gap-2 rounded-full border border-line-strong bg-background-darker pr-2 pl-4 text-subtle focus-within:border-primary">
                  <MdSearch size={20} aria-hidden />
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={
                      subFilter.placeholderKey
                        ? t(subFilter.placeholderKey)
                        : t('filterSearchPlaceholder')
                    }
                    aria-label={t(subFilter.labelKey)}
                    className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-subtle"
                  />
                </label>
              </div>
              <SheetGroup>
                {subOptions.length > 0 ? (
                  subOptions.map((option) => {
                    const on = selection(subFilter.id).includes(option.value);
                    return (
                      <SheetRow
                        key={option.value}
                        label={option.label}
                        pressed={on}
                        onClick={() => toggleOption(subFilter, option.value)}
                      >
                        <SheetCheck checked={on} radio={!subFilter.multiple} />
                      </SheetRow>
                    );
                  })
                ) : (
                  <p className="px-4 py-4 text-sm text-subtle">
                    {t('filterNoResults')}
                  </p>
                )}
              </SheetGroup>
            </>
          ) : null}
        </div>
      </Sheet>
    </>
  );
};

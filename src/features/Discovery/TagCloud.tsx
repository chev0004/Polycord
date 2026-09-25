'use client';

import { useTranslations } from 'next-intl';
import { useLayoutEffect, useRef, useState } from 'react';
import { MdCheck, MdClose, MdExpandMore } from 'react-icons/md';
import type { DiscoveryTagCount } from './discoveryTags';

export type AppliedFilter = {
  key: string;
  label: string;
  onRemove: () => void;
};

type TagCloudProps = {
  tags: DiscoveryTagCount[];
  selected: string[];
  onToggle: (tag: string) => void;
  onClear: () => void;
  collapsible?: boolean;
  applied?: AppliedFilter[];
};

type CloudLayout = {
  cut: number;
  rows: number[];
  closedHeight: number;
  fullHeight: number;
};

export const TagCloud = ({
  tags,
  selected,
  onToggle,
  onClear,
  collapsible = false,
  applied = [],
}: TagCloudProps) => {
  const t = useTranslations('Discovery');
  const cloudRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState<CloudLayout | null>(null);

  const ordered = collapsible
    ? [
        ...tags.filter(({ tag }) => selected.includes(tag)),
        ...tags.filter(({ tag }) => !selected.includes(tag)),
      ]
    : tags;
  const signature = `${collapsible}|${applied.map(({ key }) => key).join()}|${ordered.map(({ tag }) => tag).join()}|${selected.join()}`;

  // biome-ignore lint/correctness/useExhaustiveDependencies: signature captures every input that changes chip placement
  useLayoutEffect(() => {
    const cloud = cloudRef.current;
    if (!collapsible || !cloud) {
      setLayout(null);
      return;
    }

    const measure = () => {
      const chips = [...cloud.children] as HTMLElement[];
      const tops = [...new Set(chips.map((chip) => chip.offsetTop))].sort(
        (a, b) => a - b,
      );
      if (tops.length <= 2) {
        setLayout(null);
        return;
      }
      const rows = chips.map((chip) => tops.indexOf(chip.offsetTop));
      setLayout({
        cut: rows.findIndex((row) => row >= 2),
        rows,
        closedHeight: tops[1] - tops[0] + chips[0].offsetHeight,
        fullHeight: cloud.scrollHeight,
      });
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [signature]);

  const hiddenCount = layout ? applied.length + ordered.length - layout.cut : 0;

  return (
    <div className="mt-1 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="font-semibold text-[11px] text-subtle uppercase tracking-[0.06em]">
          {t('tagCloudLabel')}
        </span>
        {selected.length > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="font-medium text-[13px] text-primary-light transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-foreground focus-visible:text-foreground"
          >
            {t('tagCloudClear', { count: selected.length })}
          </button>
        ) : null}
        {layout ? (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((previous) => !previous)}
            className="ml-auto inline-flex h-8 items-center gap-0.5 pl-2 font-semibold text-[13px] text-primary focus-visible:text-primary-light active:opacity-70"
          >
            {open
              ? t('tagCloudLess')
              : t('tagCloudMore', { count: hiddenCount })}
            <MdExpandMore
              size={18}
              aria-hidden
              className={`transition-transform duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'rotate-180' : ''}`}
            />
          </button>
        ) : null}
      </div>
      <div
        ref={cloudRef}
        className="relative flex flex-wrap content-start gap-2 overflow-hidden transition-[height] duration-[550ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={
          layout
            ? { height: open ? layout.fullHeight : layout.closedHeight }
            : undefined
        }
      >
        {applied.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={filter.onRemove}
            aria-label={t('removeFilter', { label: filter.label })}
            className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary px-[13px] py-1.5 font-semibold text-[13px] text-on-primary focus-visible:bg-primary-light"
          >
            {filter.label}
            <MdClose size={15} aria-hidden />
          </button>
        ))}
        {ordered.map(({ tag, count }, index) => {
          const active = selected.includes(tag);
          const position = index + applied.length;
          const folded = layout !== null && position >= layout.cut;
          const hidden = folded && !open;

          return (
            <button
              key={tag}
              type="button"
              aria-pressed={active}
              aria-hidden={hidden || undefined}
              tabIndex={hidden ? -1 : undefined}
              onClick={() => onToggle(tag)}
              style={
                layout && folded && open
                  ? {
                      transitionDelay: `${(layout.rows[position] - 2) * 60 + (position % 6) * 18}ms`,
                    }
                  : undefined
              }
              className={`inline-flex items-center gap-1.5 rounded-full border px-[13px] py-1.5 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                folded
                  ? `transition-[opacity,transform,background-color,border-color] duration-500 ${hidden ? '-translate-y-2.5 scale-90 opacity-0' : ''}`
                  : 'transition-colors duration-150'
              } ${
                collapsible
                  ? active
                    ? 'border-transparent bg-[rgba(155,168,196,0.22)] shadow-[inset_0_0_0_1px_rgba(155,168,196,0.45)]'
                    : 'border-transparent bg-[rgba(107,114,128,0.16)] focus-visible:bg-[rgba(155,168,196,0.22)]'
                  : active
                    ? 'border-primary-dark bg-primary-dark'
                    : 'border-transparent bg-primary-darker hover:bg-primary-dark'
              }`}
            >
              <span
                className={`whitespace-nowrap text-[13px] ${
                  collapsible
                    ? active
                      ? 'text-primary-light'
                      : 'text-soft'
                    : active
                      ? 'text-foreground'
                      : 'text-primary-light'
                }`}
              >
                {tag}{' '}
                <span
                  className={
                    collapsible
                      ? `text-[11px] tabular-nums ${active ? 'text-primary' : 'text-subtle'}`
                      : `text-[12px] ${active ? 'text-primary-lighter' : 'text-subtle'}`
                  }
                >
                  ({count})
                </span>
              </span>
              {active ? (
                <MdCheck
                  size={15}
                  aria-hidden
                  className={
                    collapsible ? 'text-primary-light' : 'text-primary-lighter'
                  }
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};

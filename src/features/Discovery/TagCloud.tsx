'use client';

import { useTranslations } from 'next-intl';
import { MdCheck } from 'react-icons/md';
import type { DiscoveryTagCount } from './discoveryTags';

type TagCloudProps = {
  tags: DiscoveryTagCount[];
  selected: string[];
  onToggle: (tag: string) => void;
  onClear: () => void;
};

export const TagCloud = ({
  tags,
  selected,
  onToggle,
  onClear,
}: TagCloudProps) => {
  const t = useTranslations('Discovery');

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
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map(({ tag, count }) => {
          const active = selected.includes(tag);

          return (
            <button
              key={tag}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(tag)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-[13px] py-1.5 transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                active
                  ? 'border-primary-dark bg-primary-dark'
                  : 'border-transparent bg-primary-darker hover:bg-primary-dark'
              }`}
            >
              <span
                className={`whitespace-nowrap text-[13px] ${
                  active ? 'text-foreground' : 'text-primary-light'
                }`}
              >
                {tag}{' '}
                <span
                  className={`text-[12px] ${
                    active ? 'text-primary-lighter' : 'text-subtle'
                  }`}
                >
                  ({count})
                </span>
              </span>
              {active ? (
                <MdCheck
                  size={15}
                  aria-hidden
                  className="text-primary-lighter"
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};

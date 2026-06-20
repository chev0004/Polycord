'use client';

import { useLocale } from 'next-intl';
import { MdChatBubbleOutline } from 'react-icons/md';
import { getLookingForModeName } from '@/constants/lookingFor';

const MAX_VISIBLE = 3;

type LookingForRowProps = {
  modes: string[];
};

export const LookingForRow = ({ modes }: LookingForRowProps) => {
  const locale = useLocale();

  if (!modes.length) return null;

  const visible = modes.slice(0, MAX_VISIBLE);
  const remaining = modes.slice(MAX_VISIBLE);

  return (
    <div className="flex items-center gap-1.5 text-gray-300">
      <MdChatBubbleOutline size={15} className="shrink-0 text-gray-500" />
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {visible.map((mode) => (
          <span
            key={mode}
            className="rounded-md border border-white/10 px-2 py-[3px] text-[12px] text-gray-300"
          >
            {getLookingForModeName(mode, locale)}
          </span>
        ))}
        {remaining.length > 0 && (
          <span
            title={remaining
              .map((mode) => getLookingForModeName(mode, locale))
              .join(', ')}
            className="rounded-md bg-background-main px-2 py-[3px] text-[11px] text-gray-400"
          >
            +{remaining.length}
          </span>
        )}
      </div>
    </div>
  );
};

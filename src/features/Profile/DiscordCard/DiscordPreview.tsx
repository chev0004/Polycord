import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { type CSSProperties, useEffect, useState } from 'react';
import { ScaledDiscordCard } from './ScaledDiscordCard';
import type { DiscordCardData, DiscordCardLayoutDefinition } from './types';

const CYCLE_INTERVAL = 2800;
const CLOCK_INTERVAL = 15000;

const useCycleIndex = (count: number) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (count < 2) return;
    const timer = window.setInterval(
      () => setIndex((previous) => previous + 1),
      CYCLE_INTERVAL,
    );
    return () => window.clearInterval(timer);
  }, [count]);

  return count ? index % count : 0;
};

const useMessageTime = (locale: string) => {
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString(locale, {
          hour: 'numeric',
          minute: '2-digit',
        }),
      );
    tick();
    const timer = window.setInterval(tick, CLOCK_INTERVAL);
    return () => window.clearInterval(timer);
  }, [locale]);

  return time;
};

export const DiscordPreview = ({
  layout,
  data,
  vars,
}: {
  layout: DiscordCardLayoutDefinition;
  data: DiscordCardData;
  vars: CSSProperties;
}) => {
  const t = useTranslations('Profile');
  const tCard = useTranslations('DiscordCard');
  const locale = useLocale();
  const time = useMessageTime(locale);
  const active = useCycleIndex(data.targets.length);

  return (
    <div className="overflow-hidden rounded-lg bg-[#323339] py-3.5 pb-4 text-[#dbdee1]">
      <div className="relative pr-4 pl-[72px]">
        <div className="relative mb-1 flex h-[18px] min-w-0 items-center gap-1 whitespace-nowrap text-sm leading-[18px]">
          <span className="-left-9 absolute top-[9px] h-[13px] w-[31px] rounded-tl-md border-[#595a63] border-t-2 border-l-2" />
          <span
            aria-hidden="true"
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#4a90c4] bg-center bg-cover text-[7px] text-foreground"
            style={
              data.avatarUrl
                ? { backgroundImage: `url(${JSON.stringify(data.avatarUrl)})` }
                : undefined
            }
          >
            {data.avatarUrl ? null : data.initials.charAt(0)}
          </span>
          <span className="font-medium text-[#f2f3f5]">{data.name}</span>
          <span className="text-[#c0c0c3]">{t('discordUsed')}</span>
          <span className="inline-flex items-center gap-[3px] rounded-[3px] bg-[#3b3f65] px-[3px] font-medium text-[#76aff6] leading-[18px]">
            <span
              aria-hidden="true"
              className="grid grid-cols-[5px_5px] gap-px [&>i:nth-child(n+3)]:rounded-full [&>i]:h-[5px] [&>i]:w-[5px] [&>i]:rounded-[1px] [&>i]:bg-current"
            >
              <i />
              <i />
              <i />
              <i />
            </span>
            profile
          </span>
        </div>
        <div className="absolute top-[22px] left-4 grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-background-darker">
          <Image
            src="/polycord-logo.svg"
            alt=""
            width={24}
            height={24}
            className="h-6 w-6"
          />
        </div>
        <div className="flex h-[22px] items-center whitespace-nowrap">
          <span className="font-medium text-[#f2f3f5] text-base">
            {tCard('botName')}
          </span>
          <span className="ml-1 h-[15px] rounded-[3px] bg-[#5865f2] px-[4.4px] font-semibold text-[10px] text-foreground leading-[15px] tracking-[0.02em]">
            {t('discordApp')}
          </span>
          <span className="ml-1.5 text-[#9d9ea5] text-xs">
            {t('discordToday', { time })}
          </span>
        </div>
        <div
          role="img"
          aria-label={t('discordCardPreviewAria', {
            layout: tCard(layout.labelKey),
          })}
          className="mt-1 w-full max-w-[550px] overflow-hidden rounded-lg"
        >
          <ScaledDiscordCard
            layout={layout}
            data={data}
            vars={vars}
            active={active}
          />
        </div>
      </div>
    </div>
  );
};

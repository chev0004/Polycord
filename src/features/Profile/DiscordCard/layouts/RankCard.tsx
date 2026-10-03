import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { MdSchedule } from 'react-icons/md';
import { BrandName, CardAvatar, Cycle, Icon, TagChips } from '../CardParts';
import type { DiscordCardLayoutProps } from '../types';
import '../rank.css';

const SEGMENTS = [0, 1, 2, 3];
const segmentDelay = (
  segment: number,
  from: number,
  steps: number,
  duration: number,
) =>
  Math.max(0, steps >= from ? segment - from : from - 1 - segment) * duration;

export const RankCard = ({ data, active }: DiscordCardLayoutProps) => {
  const t = useTranslations('DiscordCard');
  const target = data.targets[active];
  const from =
    data.targets[(active + data.targets.length - 1) % data.targets.length]
      ?.steps ?? 0;
  const changing = Math.max(1, Math.abs((target?.steps ?? 0) - from));
  const duration = (0.32 + (changing - 1) * 0.12) / changing;

  return (
    <div className="dc-b3">
      <CardAvatar data={data} />
      <div className="dc-b3-m">
        <BrandName style={{ fontSize: 13, marginBottom: -4 }} />
        <div className="dc-b3-top">
          <div className="dc-b3-nm">
            {data.name}
            {data.handle ? <span>{data.handle}</span> : null}
          </div>
          {data.time ? (
            <div className="dc-b3-t">
              <b>{data.time}</b>
              <span>{t('localTime', { country: data.country })}</span>
            </div>
          ) : null}
        </div>
        <div className="dc-b3-l">
          <span style={{ fontWeight: 600 }}>{data.native.name}</span>
          <span className="dc-lv">{t('native')}</span>
        </div>
        {target ? (
          <div className="dc-b3-l">
            <Cycle targets={data.targets} active={active}>
              {(item) => <span className="dc-tag dc-t">{item.code}</span>}
            </Cycle>
            <span
              className="dc-seg dc-b3-seg"
              style={{ '--duration': `${duration}s` } as CSSProperties}
            >
              {SEGMENTS.map((segment) => (
                <i
                  key={segment}
                  className={segment < target.steps ? 'dc-on' : ''}
                  style={
                    {
                      '--d': `${segmentDelay(segment, from, target.steps, duration)}s`,
                    } as CSSProperties
                  }
                />
              ))}
            </span>
            <Cycle targets={data.targets} active={active} className="dc-end">
              {(item) => <span className="dc-lv">{item.level}</span>}
            </Cycle>
          </div>
        ) : null}
        <div className="dc-b3-f">
          <TagChips tags={data.tags} />
          {data.availability ? (
            <div className="dc-row" style={{ fontSize: 16 }}>
              <Icon
                icon={MdSchedule}
                style={{ fontSize: 20, color: 'var(--color-primary)' }}
              />
              <span>{data.availability.short}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

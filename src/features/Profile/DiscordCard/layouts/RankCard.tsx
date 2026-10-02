import { useTranslations } from 'next-intl';
import { MdSchedule } from 'react-icons/md';
import { BrandName, CardAvatar, Cycle, Icon, TagChips } from '../CardParts';
import type { DiscordCardLayoutProps } from '../types';
import '../rank.css';

const SEGMENTS = [0, 1, 2, 3];

export const RankCard = ({ data, active }: DiscordCardLayoutProps) => {
  const t = useTranslations('DiscordCard');
  const target = data.targets[active];

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
            <Cycle>
              <span key={active}>
                <span className="dc-tag dc-t">{target.code}</span>
              </span>
            </Cycle>
            <span className="dc-seg dc-b3-seg">
              {SEGMENTS.map((segment) => (
                <i
                  key={segment}
                  className={segment < target.steps ? 'dc-on' : ''}
                />
              ))}
            </span>
            <Cycle className="dc-end">
              <span key={active}>
                <span className="dc-lv">{target.level}</span>
              </span>
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

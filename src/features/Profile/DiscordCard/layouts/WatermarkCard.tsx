import { useTranslations } from 'next-intl';
import { BrandName, CardAvatar, Cycle, TagChips } from '../CardParts';
import type { DiscordCardLayoutProps } from '../types';
import '../watermark.css';

export const WatermarkCard = ({ data, active }: DiscordCardLayoutProps) => {
  const t = useTranslations('DiscordCard');
  const target = data.targets[active];

  return (
    <div className="dc-wm">
      <div className="dc-t-wm">{data.native.script}</div>
      <div className="dc-t-h">
        <CardAvatar data={data} />
        <div className="dc-t-who">
          <div className="dc-t-nm">{data.name}</div>
          <div className="dc-t-un">{data.handle}</div>
        </div>
        <BrandName
          style={{ marginLeft: 'auto', alignSelf: 'flex-start', fontSize: 16 }}
        />
      </div>
      <div className="dc-t-ls">
        <div>
          <span className="dc-k">{t('native')}</span>
          <b style={{ color: 'var(--color-primary)' }}>{data.native.name}</b>
          {data.native.script !== data.native.name ? (
            <small>{data.native.script}</small>
          ) : null}
        </div>
        {target ? (
          <div>
            <span className="dc-k">{t('learning')}</span>
            <Cycle targets={data.targets} active={active} className="dc-col">
              {(target) => (
                <>
                  <b>{target.name}</b>
                  <small>{target.level}</small>
                </>
              )}
            </Cycle>
          </div>
        ) : null}
      </div>
      <div className="dc-t-f">
        {data.availability ? <span>{data.availability.text}</span> : null}
        <span>
          {data.country}
          {data.country && data.time ? ' · ' : null}
          {data.time}
        </span>
        <TagChips tags={data.tags} small style={{ marginLeft: 'auto' }} />
      </div>
    </div>
  );
};

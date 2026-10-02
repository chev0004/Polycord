import { useTranslations } from 'next-intl';
import { BrandName, CardAvatar, Cycle, FitText, TagChips } from '../CardParts';
import type { DiscordCardLayoutProps } from '../types';
import '../split.css';

export const SplitCard = ({ data, active }: DiscordCardLayoutProps) => {
  const t = useTranslations('DiscordCard');
  const target = data.targets[active];

  return (
    <div className="dc-g">
      <div className="dc-g-l">
        <BrandName
          tone="light"
          style={{ alignSelf: 'flex-start', fontSize: 18 }}
        />
        <div style={{ marginTop: 'auto' }}>
          <span className="dc-k">{t('native')}</span>
          <FitText as="div" className="dc-g-ja" max={276}>
            {data.native.script}
          </FitText>
          {data.native.script !== data.native.name ? (
            <div className="dc-g-lv" style={{ color: 'var(--ci2)' }}>
              {data.native.name}
            </div>
          ) : null}
        </div>
      </div>
      <div className="dc-g-r">
        <div className="dc-g-h">
          <CardAvatar data={data} />
          <div className="dc-g-who">
            <div className="dc-g-nm">{data.name}</div>
            <div className="dc-g-un">{data.handle}</div>
          </div>
          <TagChips tags={data.tags} small style={{ marginLeft: 'auto' }} />
        </div>
        <div className="dc-g-big">
          <span className="dc-k">{t('learning')}</span>
          {target ? (
            <Cycle className="dc-col">
              <span key={active}>
                <FitText className="dc-g-en" max={510}>
                  {target.name}
                </FitText>
                <span className="dc-g-lv">{target.level}</span>
              </span>
            </Cycle>
          ) : null}
        </div>
        <div className="dc-g-f">
          {data.availability ? (
            <span>
              <b>{data.availability.days}</b> {data.availability.range}
            </span>
          ) : null}
          <span>
            <b>{data.country}</b>
            {data.time ? ` · ${data.time}` : null}
          </span>
        </div>
      </div>
    </div>
  );
};

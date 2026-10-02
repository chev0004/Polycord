import { useTranslations } from 'next-intl';
import { MdWifi } from 'react-icons/md';
import { BRAND_CAPS, CardAvatar, Cycle, FitText, Icon } from '../CardParts';
import type { DiscordCardLayoutProps } from '../types';
import '../metal.css';

export const MetalCard = ({ data, active }: DiscordCardLayoutProps) => {
  const t = useTranslations('DiscordCard');
  const target = data.targets[active];

  return (
    <div className="dc-mc">
      <div className="dc-mc-h">
        <span className="dc-cy">
          <span key={active}>{target?.level}</span>
        </span>
        <span
          className="dc-pn dc-mc-em"
          style={{
            fontSize: 17,
            letterSpacing: '.32em',
            marginRight: '-.32em',
          }}
        >
          {BRAND_CAPS}
        </span>
      </div>
      <div className="dc-mc-mid">
        <div className="dc-mc-cp">
          <div className="dc-mc-chip">
            <i />
            <i />
            <i />
            <i />
          </div>
          <Icon icon={MdWifi} />
        </div>
        <div className="dc-mc-no">
          <FitText className="dc-mc-em dc-z" max={200}>
            {data.native.script}
          </FitText>
          <span className="dc-ar" />
          {target ? (
            <Cycle>
              <FitText className="dc-mc-em" max={330}>
                {target.name.toLocaleUpperCase()}
              </FitText>
            </Cycle>
          ) : null}
        </div>
      </div>
      <div className="dc-mc-av">
        {data.availability ? (
          <>
            <span className="dc-mc-k">{t('available')}</span>
            <span className="dc-v dc-mc-em">{data.availability.abbr}</span>
          </>
        ) : null}
        <span className="dc-mc-k" style={{ marginLeft: 14 }}>
          {data.country}
        </span>
        {data.time ? <span className="dc-v dc-mc-em">{data.time}</span> : null}
      </div>
      <div className="dc-mc-nm dc-mc-em">{data.name}</div>
      {data.tags.length ? (
        <div className="dc-mc-in">
          <span className="dc-mc-k">{t('interests')}</span>
          <span className="dc-v dc-mc-em">{data.tagsText}</span>
        </div>
      ) : null}
      <CardAvatar data={data} style={{ left: 817, top: 208 }} />
    </div>
  );
};

import { useTranslations } from 'next-intl';
import { MdFlight } from 'react-icons/md';
import { BrandName, CardAvatar, Cycle, Icon } from '../CardParts';
import type { DiscordCardLayoutProps } from '../types';
import '../exchangePass.css';

export const ExchangePassCard = ({ data, active }: DiscordCardLayoutProps) => {
  const t = useTranslations('DiscordCard');
  const target = data.targets[active];

  return (
    <div className="dc-d">
      <div className="dc-d-m">
        <div className="dc-d-h">
          <BrandName style={{ fontSize: 16 }} />
          <span className="dc-k">{t('passTitle')}</span>
        </div>
        <div className="dc-d-rt">
          <div className="dc-cd">
            <span>{data.native.code}</span>
            <small>{t('nativeSuffix', { language: data.native.name })}</small>
          </div>
          <div className="dc-d-ln">
            <i />
            <Icon icon={MdFlight} />
            <i />
          </div>
          <div className="dc-cd dc-r">
            {target ? (
              <Cycle
                targets={data.targets}
                active={active}
                className="dc-col dc-end"
              >
                {(target) => (
                  <>
                    <span>{target.code}</span>
                    <small>
                      {target.name}
                      {target.level ? ` · ${target.level}` : null}
                    </small>
                  </>
                )}
              </Cycle>
            ) : null}
          </div>
        </div>
        <div className="dc-d-f">
          <div>
            <span className="dc-k">{t('passenger')}</span>
            <span className="dc-d-v">{data.name}</span>
          </div>
          <div>
            <span className="dc-k">{t('handleLabel')}</span>
            <span className="dc-d-v">{data.handle}</span>
          </div>
          {data.availability ? (
            <div>
              <span className="dc-k">{t('freeTime')}</span>
              <span className="dc-d-v">{data.availability.text}</span>
            </div>
          ) : null}
        </div>
        {data.tags.length ? (
          <div className="dc-d-f" style={{ marginTop: 16 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <span className="dc-k">{t('interests')}</span>
              <span className="dc-d-v">{data.tagsText}</span>
            </div>
          </div>
        ) : null}
      </div>
      <div className="dc-d-s">
        <CardAvatar data={data} />
        {data.time ? <b>{data.time}</b> : null}
        <span className="dc-k">
          {data.time
            ? t('localTimeIn', { country: data.country })
            : data.country}
        </span>
        <div className="dc-d-bc" />
      </div>
    </div>
  );
};

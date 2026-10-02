import { useTranslations } from 'next-intl';
import { MdLocationOn, MdSchedule } from 'react-icons/md';
import { BrandName, CardAvatar, Cycle, Icon, TagChips } from '../CardParts';
import type { DiscordCardLayoutProps } from '../types';
import '../greeting.css';

export const GreetingCard = ({ data, active }: DiscordCardLayoutProps) => {
  const t = useTranslations('DiscordCard');
  const target = data.targets[active];

  return (
    <div className="dc-h">
      <BrandName
        style={{ position: 'absolute', right: 28, top: 14, fontSize: 14 }}
      />
      <div className="dc-h-p">
        <CardAvatar data={data} />
        <div className="dc-h-nm">{data.name}</div>
        <div className="dc-h-un">{data.handle ? `@${data.handle}` : null}</div>
        <div className="dc-h-m">
          {data.availability ? (
            <div className="dc-row">
              <Icon icon={MdSchedule} />
              <span>
                <b>{data.availability.days}</b> {data.availability.rangeShort}
              </span>
            </div>
          ) : null}
          {data.country || data.time ? (
            <div className="dc-row">
              <Icon icon={MdLocationOn} />
              <span>
                {data.country ? <b>{data.country}</b> : null}
                {data.country && data.time ? ' · ' : null}
                {data.time}
              </span>
            </div>
          ) : null}
        </div>
      </div>
      <div className="dc-h-c">
        <div className="dc-bb dc-nat">
          <span className="dc-k">
            {t('nativeWith', { language: data.native.name })}
          </span>
          <p className="dc-z">{data.native.greeting}</p>
        </div>
        {target ? (
          <div className="dc-bb dc-lrn">
            <Cycle className="dc-col">
              <span key={active}>
                <span className="dc-k">
                  {t('learningWith', { language: target.name })}
                </span>
                <p className="dc-z">{target.greeting}</p>
              </span>
            </Cycle>
          </div>
        ) : null}
        <TagChips tags={data.tags} small style={{ alignSelf: 'flex-end' }} />
      </div>
    </div>
  );
};

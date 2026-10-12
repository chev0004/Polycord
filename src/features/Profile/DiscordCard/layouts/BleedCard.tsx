import { useTranslations } from 'next-intl';
import { BrandName, CardAvatar, Cycle, FitText, TagChips } from '../CardParts';
import type { DiscordCardLayoutProps } from '../types';
import '../bleed.css';

export const BleedCard = ({ data, active }: DiscordCardLayoutProps) => {
  const t = useTranslations('DiscordCard');
  const target = data.targets[active];

  return (
    <div className="dc-bl">
      <BrandName
        style={{ position: 'absolute', right: 36, bottom: 12, fontSize: 12 }}
      />
      <FitText as="div" className="dc-bl-ja" max={600}>
        {data.native.script}
      </FitText>
      <span className="dc-k dc-bl-nl">
        {t('nativeWith', { language: data.native.name })}
      </span>
      {target ? (
        <Cycle
          targets={data.targets}
          active={active}
          className="dc-col dc-bl-cy"
        >
          {(target) => (
            <>
              <span className="dc-k">
                {t('learningLevel', { level: target.level })}
              </span>
              <FitText className="dc-bl-en" max={600}>
                {target.name}
              </FitText>
            </>
          )}
        </Cycle>
      ) : null}
      <div className="dc-bl-r">
        <CardAvatar data={data} />
        <div className="dc-bl-nm">{data.name}</div>
        <div className="dc-bl-un">{data.handle}</div>
        <TagChips
          tags={data.tags}
          small
          style={{ justifyContent: 'safe flex-end', marginTop: 8 }}
        />
        <div className="dc-bl-f">
          {data.availability ? (
            <>
              {data.availability.text}
              <br />
            </>
          ) : null}
          {data.country}
          {data.country && data.time ? ' · ' : null}
          {data.time}
        </div>
      </div>
    </div>
  );
};

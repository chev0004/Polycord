import { useTranslations } from 'next-intl';
import { BrandName, CardAvatar, Cycle, FitText, TagChips } from '../CardParts';
import type { DiscordCardLayoutProps } from '../types';
import '../diagonal.css';

export const DiagonalCard = ({ data, active }: DiscordCardLayoutProps) => {
  const t = useTranslations('DiscordCard');
  const target = data.targets[active];

  return (
    <div className="dc-dg">
      <div className="dc-dg-bl" />
      <div className="dc-dg-tl">
        <BrandName tone="light" style={{ fontSize: 14, marginBottom: 6 }} />
        <span>{data.name}</span>
        <small>{data.handle}</small>
      </div>
      <div className="dc-dg-bl2">
        <span className="dc-k">
          {t('nativeWith', { language: data.native.name })}
        </span>
        <FitText as="div" className="dc-dg-ja" max={320}>
          {data.native.script}
        </FitText>
      </div>
      <CardAvatar data={data} />
      <div className="dc-dg-tr">
        {data.availability ? (
          <>
            {data.availability.text}
            <br />
          </>
        ) : null}
        {data.country}
        {data.country && data.time ? ' · ' : null}
        {data.time}
        <TagChips
          tags={data.tags}
          small
          style={{ justifyContent: 'flex-end', marginTop: 10 }}
        />
      </div>
      {target ? (
        <div className="dc-dg-br">
          <span className="dc-k">{t('learning')}</span>
          <Cycle
            targets={data.targets}
            active={active}
            className="dc-col dc-end"
          >
            {(target) => (
              <>
                <FitText className="dc-dg-en" max={330}>
                  {target.name}
                </FitText>
                <span className="dc-dg-lv">{target.level}</span>
              </>
            )}
          </Cycle>
        </div>
      ) : null}
    </div>
  );
};

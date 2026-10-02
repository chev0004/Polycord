import { useTranslations } from 'next-intl';
import { BrandName, CardAvatar, Cycle, FitText, TagChips } from '../CardParts';
import type { DiscordCardLayoutProps } from '../types';
import '../mirror.css';

export const MirrorCard = ({ data, active }: DiscordCardLayoutProps) => {
  const t = useTranslations('DiscordCard');
  const target = data.targets[active];

  return (
    <div className="dc-mi">
      <BrandName
        style={{ position: 'absolute', left: 28, top: 20, fontSize: 14 }}
      />
      <div className="dc-mi-l">
        <span className="dc-k">{t('speaks')}</span>
        <FitText as="div" className="dc-mi-ja" max={300}>
          {data.native.script}
        </FitText>
        <div className="dc-mi-s">
          {t('nativeSuffix', { language: data.native.name })}
        </div>
      </div>
      <div className="dc-mi-c">
        <CardAvatar data={data} />
        <div className="dc-mi-nm">{data.name}</div>
        <div className="dc-mi-un">{data.handle}</div>
      </div>
      <div className="dc-mi-r">
        <span className="dc-k">{t('learning')}</span>
        {target ? (
          <Cycle targets={data.targets} active={active} className="dc-col">
            {(target) => (
              <>
                <FitText className="dc-mi-en" max={300}>
                  {target.name}
                </FitText>
                <span className="dc-mi-s">{target.level}</span>
              </>
            )}
          </Cycle>
        ) : null}
      </div>
      <div className="dc-mi-f">
        {data.availability ? <span>{data.availability.text}</span> : null}
        <span>
          {data.country}
          {data.country && data.time ? ' · ' : null}
          {data.time}
        </span>
        <TagChips tags={data.tags} small />
      </div>
    </div>
  );
};

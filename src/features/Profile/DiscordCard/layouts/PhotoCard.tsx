import { useTranslations } from 'next-intl';
import {
  avatarBackground,
  BrandName,
  Cycle,
  LocationRow,
  ScheduleRow,
  TagChips,
} from '../CardParts';
import type { DiscordCardLayoutProps } from '../types';
import '../photo.css';

export const PhotoCard = ({ data, active }: DiscordCardLayoutProps) => {
  const t = useTranslations('DiscordCard');
  const target = data.targets[active];

  return (
    <div className="dc-ph">
      <div className="dc-ph-img" style={avatarBackground(data.avatarUrl)}>
        {data.avatarUrl ? null : data.initials}
      </div>
      <div className="dc-ph-r">
        <BrandName
          style={{ position: 'absolute', right: 32, top: 28, fontSize: 15 }}
        />
        <div className="dc-ph-nm">{data.name}</div>
        <div className="dc-ph-un">{data.handle}</div>
        <TagChips tags={data.tags} small style={{ marginTop: 12 }} />
        <div className="dc-ph-dl">
          <span className="dc-k">{t('speaks')}</span>
          <b>
            {data.native.script !== data.native.name ? (
              <>
                <span
                  className="dc-z"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {data.native.script}
                </span>{' '}
              </>
            ) : null}
            <span>{data.native.name}</span>
          </b>
          <span className="dc-k">{t('learning')}</span>
          <b>
            {target ? (
              <Cycle targets={data.targets} active={active}>
                {(target) => (
                  <>
                    <span>{target.name}</span>
                    {target.level ? (
                      <span className="dc-ph-lv">· {target.level}</span>
                    ) : null}
                  </>
                )}
              </Cycle>
            ) : null}
          </b>
        </div>
        <div className="dc-ph-f">
          <ScheduleRow data={data} />
          <LocationRow data={data} />
        </div>
      </div>
    </div>
  );
};

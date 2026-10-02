import { useTranslations } from 'next-intl';
import {
  BrandName,
  CardAvatar,
  Cycle,
  LocationRow,
  ScheduleRow,
  TagChips,
} from '../CardParts';
import type { DiscordCardLayoutProps } from '../types';
import '../classic.css';

export const ClassicCard = ({ data, active }: DiscordCardLayoutProps) => {
  const t = useTranslations('DiscordCard');
  const target = data.targets[active];

  return (
    <div className="dc-a">
      <div className="dc-a-bn">
        <BrandName
          tone="light"
          style={{ position: 'absolute', right: 28, top: 26, fontSize: 20 }}
        />
      </div>
      <CardAvatar data={data} />
      <div className="dc-a-body">
        <div>
          <div className="dc-a-nm">{data.name}</div>
          <div className="dc-a-un">{data.handle}</div>
          <div className="dc-pills">
            <span className="dc-pill dc-pri">
              {data.native.script !== data.native.name ? (
                <span className="dc-z">{data.native.script}</span>
              ) : null}
              <span>{data.native.name}</span>
            </span>
            {target ? (
              <span className="dc-pill">
                <Cycle targets={data.targets} active={active}>
                  {(target) => (
                    <>
                      <span>{target.name}</span>
                      {target.level ? <small>· {target.level}</small> : null}
                    </>
                  )}
                </Cycle>
              </span>
            ) : null}
          </div>
        </div>
        <div className="dc-a-rows">
          <ScheduleRow data={data} />
          <LocationRow
            data={data}
            currently={(time) => t('currently', { time })}
          />
          <TagChips tags={data.tags} />
        </div>
      </div>
    </div>
  );
};

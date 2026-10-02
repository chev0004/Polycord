import { useTranslations } from 'next-intl';
import {
  avatarBackground,
  BrandName,
  Cycle,
  FitText,
  TagChips,
} from '../CardParts';
import type { DiscordCardLayoutProps } from '../types';
import '../characterSelect.css';

const SEGMENTS = [0, 1, 2, 3];
const PAGE_SIZE = 3;
const TILE_STEP = 134;

export const CharacterSelectCard = ({
  data,
  active,
}: DiscordCardLayoutProps) => {
  const t = useTranslations('DiscordCard');
  const target = data.targets[active];
  const page = Math.floor(active / PAGE_SIZE) * PAGE_SIZE;
  const visible = data.targets.slice(page, page + PAGE_SIZE);

  return (
    <div className="dc-cs">
      <div className="dc-cs-p" style={avatarBackground(data.avatarUrl)}>
        <span className="dc-cs-p1">{t('player')}</span>
        {data.avatarUrl ? null : <b>{data.initials}</b>}
        <BrandName
          tone="light"
          style={{ position: 'absolute', left: 18, bottom: 14, fontSize: 15 }}
        />
      </div>
      <div className="dc-cs-r">
        <div className="dc-cs-top">
          <div className="dc-cs-id">
            <b>{data.name}</b>
            <span>{data.handle}</span>
          </div>
          <div className="dc-cs-in">
            <TagChips tags={data.tags} small />
            <span>
              {data.availability ? `${data.availability.text} · ` : null}
              {data.country}
              {data.country && data.time ? ' · ' : null}
              {data.time}
            </span>
          </div>
        </div>
        <div className="dc-cs-row">
          <div className="dc-cs-t dc-nat">
            <FitText as="b" className="dc-z" max={94}>
              {data.native.script}
            </FitText>
            <small>{t('homeNative')}</small>
          </div>
          {visible.map((item) => (
            <div key={item.code} className="dc-cs-t">
              <b>{item.code}</b>
              <small>{item.name}</small>
            </div>
          ))}
          <div
            className="dc-cs-cur"
            style={{
              transform: `translateX(${TILE_STEP * ((active % PAGE_SIZE) + 1)}px)`,
            }}
          >
            <span>{t('player')}</span>
          </div>
        </div>
        {target ? (
          <div className="dc-cs-sel">
            <Cycle targets={data.targets} active={active}>
              {(target) => (
                <>
                  <FitText className="dc-cs-w" max={360}>
                    {target.name}
                  </FitText>
                  <span className="dc-cs-lv">
                    <small>{t('levelShort', { level: target.level })}</small>
                    <span className="dc-seg">
                      {SEGMENTS.map((segment) => (
                        <i
                          key={segment}
                          className={segment < target.steps ? 'dc-on' : ''}
                        />
                      ))}
                    </span>
                  </span>
                </>
              )}
            </Cycle>
          </div>
        ) : null}
      </div>
    </div>
  );
};

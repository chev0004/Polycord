import { useTranslations } from 'next-intl';
import {
  avatarBackground,
  BRAND_CAPS,
  BrandName,
  TagChips,
} from '../CardParts';
import type { DiscordCardLayoutProps } from '../types';
import '../nowPlaying.css';

const PAGE_SIZE = 3;

export const NowPlayingCard = ({ data, active }: DiscordCardLayoutProps) => {
  const t = useTranslations('DiscordCard');
  const target = data.targets[active];
  const page = Math.floor(active / PAGE_SIZE) * PAGE_SIZE;
  const tracks = data.targets.slice(page, page + PAGE_SIZE);

  return (
    <div className="dc-np">
      <div className="dc-np-art">
        <div className="dc-np-rec">
          <div className="dc-np-lb">
            <span>{target?.code}</span>
            <small>{BRAND_CAPS}</small>
          </div>
        </div>
        <div className="dc-np-sh" />
        <div className="dc-np-sl" style={avatarBackground(data.avatarUrl)}>
          {data.avatarUrl ? null : data.initials}
        </div>
      </div>
      <div className="dc-np-r">
        <div className="dc-np-top">
          <span className="dc-k">{t('nowPlaying')}</span>
          <BrandName style={{ fontSize: 13 }} />
        </div>
        <div className="dc-np-nm">{data.name}</div>
        <div className="dc-np-un">
          {data.handle}
          {data.country ? ` · ${data.country}` : null}
          {data.time ? ` · ${data.time}` : null}
        </div>
        <div className="dc-np-tl">
          <div className="dc-np-t dc-nat">
            <span>A1</span>
            <span>
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
              {data.native.name}
            </span>
            <span>{t('native')}</span>
          </div>
          {tracks.map((track, index) => (
            <div
              key={track.code}
              className={`dc-np-t ${page + index === active ? 'dc-on' : ''}`}
            >
              <span>{`B${page + index + 1}`}</span>
              <span>{track.name}</span>
              <span>{track.level}</span>
            </div>
          ))}
        </div>
        <div className="dc-np-pg">
          <div className="dc-np-bar">
            <i key={active} />
          </div>
          <div className="dc-np-ft">
            {data.availability ? <span>{data.availability.text}</span> : null}
            <TagChips tags={data.tags} small />
          </div>
        </div>
      </div>
    </div>
  );
};

import type { CSSProperties, ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { MdLocationOn, MdSchedule } from 'react-icons/md';
import type { DiscordCardData } from './types';
import './base.css';

export const BrandName = ({
  tone = 'dark',
  style,
}: {
  tone?: 'dark' | 'light';
  style?: CSSProperties;
}) => (
  <span
    className={`dc-pn ${tone === 'dark' ? 'dc-pn-d' : 'dc-pn-l'}`}
    style={style}
  >
    Polycord.net
  </span>
);

export const CardAvatar = ({
  data,
  style,
}: {
  data: DiscordCardData;
  style?: CSSProperties;
}) =>
  data.avatarUrl ? (
    <div
      className="dc-av"
      style={{
        backgroundImage: `url(${JSON.stringify(data.avatarUrl)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        ...style,
      }}
    />
  ) : (
    <div className="dc-av" style={style}>
      {data.initials}
    </div>
  );

export const Cycle = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => (
  <span className={`dc-cy ${className}`}>
    <span>{children}</span>
  </span>
);

export const Icon = ({ icon: Glyph }: { icon: IconType }) => (
  <Glyph className="dc-ms" aria-hidden="true" />
);

export const ScheduleRow = ({ data }: { data: DiscordCardData }) =>
  data.availability ? (
    <div className="dc-row">
      <Icon icon={MdSchedule} />
      <span>
        <b>{data.availability.days}</b> {data.availability.range}
      </span>
    </div>
  ) : null;

export const LocationRow = ({
  data,
  currently,
}: {
  data: DiscordCardData;
  currently: (time: string) => string;
}) =>
  data.country || data.time ? (
    <div className="dc-row">
      <Icon icon={MdLocationOn} />
      <span>
        {data.country ? <b>{data.country}</b> : null}
        {data.country && data.time ? ' · ' : null}
        {data.time ? currently(data.time) : null}
      </span>
    </div>
  ) : null;

export const TagChips = ({
  tags,
  small = false,
  style,
}: {
  tags: string[];
  small?: boolean;
  style?: CSSProperties;
}) =>
  tags.length ? (
    <div className={`dc-chips ${small ? 'dc-sm' : ''}`} style={style}>
      {tags.slice(0, 3).map((tag) => (
        <span key={tag} className="dc-chip">
          {tag}
        </span>
      ))}
      {tags.length > 3 ? (
        <span className="dc-chip">+{tags.length - 3}</span>
      ) : null}
    </div>
  ) : null;

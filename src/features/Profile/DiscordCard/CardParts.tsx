import {
  type CSSProperties,
  type ReactNode,
  useLayoutEffect,
  useRef,
} from 'react';
import type { IconType } from 'react-icons';
import { MdLocationOn, MdSchedule } from 'react-icons/md';
import type { DiscordCardData } from './types';
import './base.css';

export const BRAND_CAPS = 'POLYCORD.NET';

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

export const avatarBackground = (avatarUrl?: string): CSSProperties =>
  avatarUrl
    ? {
        backgroundImage: `url(${JSON.stringify(avatarUrl)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {};

export const CardAvatar = ({
  data,
  style,
}: {
  data: DiscordCardData;
  style?: CSSProperties;
}) => (
  <div
    className="dc-av"
    style={{ ...avatarBackground(data.avatarUrl), ...style }}
  >
    {data.avatarUrl ? null : data.initials}
  </div>
);

export const Cycle = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => <span className={`dc-cy ${className}`}>{children}</span>;

export const FitText = ({
  max,
  as: Tag = 'span',
  className,
  children,
}: {
  max: number;
  as?: 'span' | 'div' | 'b';
  className?: string;
  children: string;
}) => {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !children) return;
    const fit = () => {
      element.style.fontSize = '';
      element.style.width = 'max-content';
      const natural = element.offsetWidth;
      element.style.width = '';
      if (natural > max) {
        element.style.fontSize = `${(Number.parseFloat(getComputedStyle(element).fontSize) * max) / natural}px`;
      }
    };
    fit();
    document.fonts?.ready.then(fit);
  }, [max, children]);

  return (
    <Tag ref={ref as never} className={className}>
      {children}
    </Tag>
  );
};

export const Icon = ({
  icon: Glyph,
  style,
}: {
  icon: IconType;
  style?: CSSProperties;
}) => <Glyph className="dc-ms" style={style} aria-hidden="true" />;

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
  currently?: (time: string) => string;
}) =>
  data.country || data.time ? (
    <div className="dc-row">
      <Icon icon={MdLocationOn} />
      <span>
        {data.country ? <b>{data.country}</b> : null}
        {data.country && data.time ? ' · ' : null}
        {data.time ? (currently ? currently(data.time) : data.time) : null}
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

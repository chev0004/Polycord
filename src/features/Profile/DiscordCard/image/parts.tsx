import type { CSSProperties, ReactNode } from 'react';
import type { DiscordCardData } from '../types';
import type { Measure } from './measure';
import type { CardPalette } from './palette';

export type CardImageProps = {
  data: DiscordCardData;
  active: number;
  lit?: number;
  palette: CardPalette;
  measure: Measure;
  t: (key: string, values?: Record<string, string>) => string;
};

export const ICONS = {
  schedule:
    'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zM12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z',
  location:
    'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z',
  flight:
    'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z',
  wifi: 'm1 9 2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8 3 3 3-3a4.237 4.237 0 0 0-6 0zm-4-4 2 2a7.074 7.074 0 0 1 10 0l2-2C15.14 9.14 8.87 9.14 5 13z',
};

export const Icon = ({
  path,
  size,
  color,
}: {
  path: string;
  size: number;
  color: string;
}) => (
  <svg
    aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
  >
    <path d={path} />
  </svg>
);

export const Avatar = ({
  data,
  size,
  fontSize,
  style,
}: {
  data: DiscordCardData;
  size: number;
  fontSize: number;
  style?: CSSProperties;
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      flexShrink: 0,
      borderRadius: 9999,
      background: '#4a90c4',
      color: '#fff',
      fontSize,
      fontWeight: 700,
      overflow: 'hidden',
      ...style,
    }}
  >
    {data.avatarUrl ? (
      // biome-ignore lint/performance/noImgElement: Satori renders plain img elements
      <img src={data.avatarUrl} width={size} height={size} alt="" />
    ) : (
      data.initials
    )}
  </div>
);

export const Brand = ({
  color,
  size,
  style,
}: {
  color: string;
  size: number;
  style?: CSSProperties;
}) => (
  <span
    style={{
      color,
      fontSize: size,
      fontWeight: 800,
      letterSpacing: '-0.01em',
      lineHeight: 1,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    Polycord.net
  </span>
);

export const Kicker = ({
  children,
  palette,
  style,
}: {
  children: ReactNode;
  palette: CardPalette;
  style?: CSSProperties;
}) => (
  <span
    style={{
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: palette.subtle,
      ...style,
    }}
  >
    {children}
  </span>
);

export const Row = ({
  icon,
  palette,
  size = 18,
  iconSize = 24,
  children,
}: {
  icon: string;
  palette: CardPalette;
  size?: number;
  iconSize?: number;
  children: ReactNode;
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      height: iconSize + 3,
      fontSize: size,
      color: palette.soft,
    }}
  >
    <Icon path={icon} size={iconSize} color={palette.primary} />
    <span style={{ display: 'flex', whiteSpace: 'pre' }}>{children}</span>
  </div>
);

export const Strong = ({ children }: { children: ReactNode }) => (
  <span style={{ color: '#fff', fontWeight: 600 }}>{children}</span>
);

type RowProps = Pick<CardImageProps, 'data' | 'palette'> & {
  size?: number;
  iconSize?: number;
};

export const ScheduleRow = ({ data, palette, size, iconSize }: RowProps) =>
  data.availability ? (
    <Row
      icon={ICONS.schedule}
      palette={palette}
      size={size}
      iconSize={iconSize}
    >
      <Strong>{data.availability.days}</Strong>
      <span>{` ${data.availability.range}`}</span>
    </Row>
  ) : null;

export const LocationRow = ({
  data,
  palette,
  size,
  iconSize,
  currently,
}: RowProps & { currently?: (time: string) => string }) =>
  data.country || data.time ? (
    <Row
      icon={ICONS.location}
      palette={palette}
      size={size}
      iconSize={iconSize}
    >
      {data.country ? <Strong>{data.country}</Strong> : null}
      {data.country && data.time ? <span> · </span> : null}
      {data.time ? (
        <span>{currently ? currently(data.time) : data.time}</span>
      ) : null}
    </Row>
  ) : null;

export const Chips = ({
  tags,
  palette,
  measure,
  max,
  small = false,
  background,
  color,
  style,
}: {
  tags: string[];
  palette: CardPalette;
  measure: Measure;
  max: number;
  small?: boolean;
  background?: string;
  color?: string;
  style?: CSSProperties;
}) => {
  if (!tags.length) return null;
  const size = small ? 13 : 15;
  const padding = small ? 10 : 12;
  const gap = small ? 6 : 8;
  const chip = (text: string) =>
    measure(text, { size, weight: 500 }) + padding * 2 + 3;
  const widths = tags.map(chip);
  let shown = tags.length;
  while (
    shown > 1 &&
    widths.slice(0, shown).reduce((sum, width) => sum + width + gap, 0) +
      (shown < tags.length ? chip(`+${tags.length - shown}`) : -gap) >
      max
  )
    shown -= 1;
  const items = tags.slice(0, shown);
  if (shown < tags.length) items.push(`+${tags.length - shown}`);

  return (
    <div
      style={{
        display: 'flex',
        gap,
        maxWidth: max,
        overflow: 'hidden',
        ...style,
      }}
    >
      {items.map((tag, index) => (
        <span
          key={tag}
          style={{
            display: 'flex',
            alignItems: 'center',
            height: small ? 26 : 32,
            padding: `0 ${padding}px`,
            borderRadius: 9999,
            border: `1.5px solid ${palette.dark}`,
            background: background ?? 'transparent',
            fontSize: size,
            fontWeight: 500,
            color: color ?? palette.light,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flexShrink:
              index === items.length - 1 && shown < tags.length ? 0 : 1,
            minWidth: 0,
          }}
        >
          {tag}
        </span>
      ))}
    </div>
  );
};

export const Segments = ({
  steps,
  palette,
  width,
  height = 12,
  off = palette.darker,
}: {
  steps: number;
  palette: CardPalette;
  width: number;
  height?: number;
  off?: string;
}) => (
  <div style={{ display: 'flex', gap: 6, width, height }}>
    {[0, 1, 2, 3].map((segment) => (
      <div
        key={segment}
        style={{
          flex: 1,
          borderRadius: 9999,
          background: segment < steps ? palette.fill : off,
        }}
      />
    ))}
  </div>
);

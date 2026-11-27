import type { ReactNode } from 'react';
import { fitTags } from '../measure';
import type { CardPalette } from '../palette';
import {
  Avatar,
  Brand,
  type CardImageProps,
  ICONS,
  Icon,
  Kicker,
} from '../parts';

const MAIN = 622;
const SHAPE =
  'M20,0 H676 A18,18 0 0 0 712,0 H914 A20,20 0 0 1 934,20 V300 A20,20 0 0 1 914,320 H712 A18,18 0 0 0 676,320 H20 A20,20 0 0 1 0,300 V20 A20,20 0 0 1 20,0 Z';
const BARS = [
  [0, 3],
  [6, 1],
  [11, 4],
];

const Field = ({
  label,
  palette,
  width,
  children,
}: {
  label: string;
  palette: CardPalette;
  width: number;
  children: ReactNode;
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 9, width }}>
    <Kicker palette={palette} style={{ fontSize: 12 }}>
      {label}
    </Kicker>
    <span
      style={{
        fontSize: 18,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {children}
    </span>
  </div>
);

export const ExchangePassImage = ({
  data,
  palette,
  measure,
  t,
}: CardImageProps) => {
  const target = data.targets[0];
  const dots = {
    flex: 1,
    height: 2,
    backgroundImage: `linear-gradient(90deg, ${palette.dark} 50%, transparent 50%)`,
    backgroundSize: '4px 2px',
  };
  const interests = fitTags(
    measure,
    data.tags,
    { size: 18, weight: 600 },
    MAIN,
  );

  return (
    <div
      style={{ display: 'flex', position: 'relative', width: 934, height: 320 }}
    >
      <svg
        aria-hidden="true"
        width={934}
        height={320}
        viewBox="0 0 934 320"
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        <path d={SHAPE} fill={palette.surface} />
      </svg>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 694,
          padding: '28px 36px',
          borderRight: `2px dashed ${palette.dark}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Brand color="#fff" size={16} />
          <Kicker palette={palette} style={{ fontSize: 18, fontWeight: 800 }}>
            {t('passTitle')}
          </Kicker>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            margin: '22px 0 24px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: 72,
                fontWeight: 900,
                lineHeight: 0.9,
                letterSpacing: '-0.02em',
              }}
            >
              {data.native.code}
            </span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: palette.soft,
                marginTop: 8,
              }}
            >
              {t('nativeSuffix', { language: data.native.name })}
            </span>
          </div>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}
          >
            <div style={dots} />
            <div style={{ display: 'flex', transform: 'rotate(90deg)' }}>
              <Icon path={ICONS.flight} size={30} color={palette.primary} />
            </div>
            <div style={dots} />
          </div>
          {target ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                color: palette.primary,
              }}
            >
              <span
                style={{
                  fontSize: 72,
                  fontWeight: 900,
                  lineHeight: 0.9,
                  letterSpacing: '-0.02em',
                }}
              >
                {target.code}
              </span>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 500,
                  color: palette.soft,
                  marginTop: 8,
                }}
              >
                {[target.name, target.level].filter(Boolean).join(' · ')}
              </span>
            </div>
          ) : null}
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 'auto' }}>
          <Field label={t('passenger')} palette={palette} width={182.9}>
            {data.name}
          </Field>
          <Field label={t('handleLabel')} palette={palette} width={166.3}>
            {data.handle}
          </Field>
          {data.availability ? (
            <Field label={t('freeTime')} palette={palette} width={232.8}>
              {data.availability.text}
            </Field>
          ) : null}
        </div>
        {data.tags.length ? (
          <div style={{ display: 'flex', marginTop: 19 }}>
            <Field label={t('interests')} palette={palette} width={MAIN}>
              {interests}
            </Field>
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          width: 240,
          padding: '28px 30px',
          overflow: 'hidden',
        }}
      >
        <Avatar
          data={data}
          size={92}
          fontSize={32}
          style={{ marginBottom: 10 }}
        />
        {data.time ? (
          <span style={{ fontSize: 44, fontWeight: 800, lineHeight: 1 }}>
            {data.time}
          </span>
        ) : null}
        <Kicker palette={palette} style={{ fontSize: 12 }}>
          {data.time
            ? t('localTimeIn', { country: data.country })
            : data.country}
        </Kicker>
        <svg
          aria-hidden="true"
          width={180}
          height={40}
          viewBox="0 0 180 40"
          style={{ marginTop: 'auto', opacity: 0.8 }}
        >
          {[...Array(11).keys()].flatMap((period) =>
            BARS.map(([x, width]) => (
              <rect
                key={`${period}-${x}`}
                x={period * 17 + x}
                y={0}
                width={width}
                height={40}
                fill={palette.primary}
              />
            )),
          )}
        </svg>
      </div>
    </div>
  );
};

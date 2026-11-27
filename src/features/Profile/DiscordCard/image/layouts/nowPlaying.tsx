import type { ReactNode } from 'react';
import { Avatar, Brand, type CardImageProps, Chips, Kicker } from '../parts';

const RIGHT = 462;
const GROOVES = [...Array(42).keys()].map((ring) => 127 - ring * 3);
const SHEEN = [
  { from: 50, to: 100, alpha: 0.07 },
  { from: 230, to: 280, alpha: 0.05 },
];

const wedge = (start: number, end: number) => {
  const point = (angle: number) => {
    const radians = ((angle - 90) * Math.PI) / 180;
    return `${128 + 128 * Math.cos(radians)},${128 + 128 * Math.sin(radians)}`;
  };
  return `M128,128 L${point(start)} A128,128 0 0 1 ${point(end)} Z`;
};

const Track = ({
  code,
  children,
  level,
  color,
  codeColor,
  bold = false,
}: {
  code: string;
  children: ReactNode;
  level: string;
  color: string;
  codeColor?: string;
  bold?: boolean;
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      height: 35,
      fontSize: 18,
      fontWeight: bold ? 700 : 400,
      color,
    }}
  >
    <span
      style={{
        width: 40,
        flexShrink: 0,
        fontSize: 13,
        fontWeight: 800,
        letterSpacing: '0.06em',
        color: codeColor ?? color,
      }}
    >
      {code}
    </span>
    <span
      style={{
        display: 'flex',
        flex: 1,
        minWidth: 0,
        whiteSpace: 'pre',
        overflow: 'hidden',
      }}
    >
      {children}
    </span>
    <span style={{ fontSize: 15 }}>{level}</span>
  </div>
);

export const NowPlayingImage = ({
  data,
  palette,
  measure,
  t,
}: CardImageProps) => {
  const schedule = data.availability
    ? measure(data.availability.text, { size: 14 }) + 12
    : 0;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 20,
        width: 934,
        height: 320,
        padding: '32px 40px 32px 32px',
        borderRadius: 24,
        background: palette.deep,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          position: 'relative',
          width: 380,
          height: 256,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'absolute',
            left: 62,
            top: 0,
            width: 256,
            height: 256,
            borderRadius: 9999,
            background: '#101214',
            boxShadow: '0 10px 28px rgba(0, 0, 0, 0.55)',
          }}
        >
          <svg
            aria-hidden="true"
            width={256}
            height={256}
            viewBox="0 0 256 256"
            style={{ position: 'absolute', left: 0, top: 0 }}
          >
            {GROOVES.map((radius) => (
              <circle
                key={radius}
                cx={128}
                cy={128}
                r={radius}
                fill="none"
                stroke="#1a1d20"
                strokeWidth={1}
              />
            ))}
            {SHEEN.flatMap(({ from, to, alpha }) =>
              [...Array(10).keys()].map((slice) => {
                const start = from + ((to - from) * slice) / 10;
                const middle = 1 - Math.abs(slice + 0.5 - 5) / 5;
                return (
                  <path
                    key={`${from}-${slice}`}
                    d={wedge(start, start + (to - from) / 10)}
                    fill={`rgba(255, 255, 255, ${(alpha * middle).toFixed(4)})`}
                  />
                );
              }),
            )}
          </svg>
          <Avatar
            data={data}
            size={124}
            fontSize={44}
            style={{
              boxShadow: `0 0 0 5px #0a0b0c, 0 0 0 7px ${palette.primary}`,
            }}
          />
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: RIGHT,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Kicker palette={palette}>{t('nowPlaying')}</Kicker>
          <Brand color="#fff" size={13} />
        </div>
        <span
          style={{
            flexShrink: 0,
            fontSize: 34,
            fontWeight: 800,
            lineHeight: 1.1,
            marginTop: 6,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {data.name}
        </span>
        <span
          style={{
            flexShrink: 0,
            fontSize: 16,
            color: palette.soft,
            marginTop: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {[data.handle, data.country, data.time].filter(Boolean).join(' · ')}
        </span>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            marginTop: 14,
          }}
        >
          <Track code="A1" level={t('native')} color={palette.soft}>
            {data.native.script !== data.native.name ? (
              <span style={{ fontFamily: 'Zen', color: palette.primary }}>
                {`${data.native.script} `}
              </span>
            ) : null}
            <span>{data.native.name}</span>
          </Track>
          {data.targets.slice(0, 3).map((track, index) => (
            <Track
              key={track.code}
              code={`B${index + 1}`}
              level={track.level}
              color={index === 0 ? '#fff' : palette.subtle}
              codeColor={index === 0 ? palette.primary : undefined}
              bold={index === 0}
            >
              <span>{track.name}</span>
            </Track>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            flexShrink: 0,
            marginTop: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              height: 4,
              borderRadius: 2,
              background: palette.fill,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {data.availability ? (
              <span
                style={{
                  fontSize: 14,
                  color: palette.subtle,
                  whiteSpace: 'nowrap',
                }}
              >
                {data.availability.text}
              </span>
            ) : null}
            <div
              style={{
                display: 'flex',
                flex: 1,
                justifyContent: data.availability ? 'flex-end' : 'flex-start',
                minWidth: 0,
              }}
            >
              <Chips
                tags={data.tags}
                palette={palette}
                measure={measure}
                max={RIGHT - schedule}
                small
                color={palette.subtle}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

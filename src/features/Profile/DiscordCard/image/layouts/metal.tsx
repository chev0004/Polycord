import type { CSSProperties, ReactNode } from 'react';
import { fitSize, fitTags } from '../measure';
import { Avatar, type CardImageProps, ICONS, Icon } from '../parts';

const EMBOSSED: CSSProperties = {
  color: '#c4ccd4',
  textShadow:
    '-1px -1px 0 rgba(255, 255, 255, 0.14), 1px 1px 0 #000, 2px 2px 2px rgba(0, 0, 0, 0.6)',
};
const MONO: CSSProperties = {
  fontFamily: 'Mono',
  fontWeight: 700,
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};
const LABEL = '#6b747d';

const Label = ({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) => (
  <span
    style={{
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.16em',
      lineHeight: 1.2,
      textTransform: 'uppercase',
      color: LABEL,
      ...style,
    }}
  >
    {children}
  </span>
);

export const MetalImage = ({ data, palette, measure, t }: CardImageProps) => {
  const target = data.targets[0];
  const groove =
    palette.ink === '#fff'
      ? 'rgba(255, 255, 255, 0.28)'
      : 'rgba(17, 17, 17, 0.28)';
  const number = { size: 38, spacing: 0.12, mono: true };

  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width: 934,
        height: 320,
        borderRadius: 24,
        background: '#141619',
        boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.06)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 934,
          height: 320,
          opacity: 0.06,
          backgroundImage: `linear-gradient(115deg, transparent 52%, ${palette.primary} 52%, ${palette.primary} 64%, transparent 64%, transparent 68%, ${palette.primary} 68%, ${palette.primary} 70%, transparent 70%)`,
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'absolute',
          left: 44,
          right: 44,
          top: 32,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#8a949e',
          }}
        >
          {target?.level ?? ''}
        </span>
        <span
          style={{
            ...EMBOSSED,
            fontSize: 17,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '0.32em',
            marginRight: '-0.32em',
          }}
        >
          POLYCORD.NET
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 110,
          position: 'absolute',
          left: 44,
          top: 136,
          height: 48,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              position: 'relative',
              width: 62,
              height: 48,
              borderRadius: 9,
              background: palette.fill,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 15,
                height: 1.5,
                background: groove,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 31,
                height: 1.5,
                background: groove,
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 21,
                width: 1.5,
                background: groove,
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 40,
                width: 1.5,
                background: groove,
              }}
            />
          </div>
          <div style={{ display: 'flex', transform: 'rotate(90deg)' }}>
            <Icon path={ICONS.wifi} size={30} color={LABEL} />
          </div>
        </div>
        <div
          style={{
            ...MONO,
            display: 'flex',
            alignItems: 'center',
            gap: 22,
            fontSize: 38,
            lineHeight: 1,
            letterSpacing: '0.12em',
          }}
        >
          <span
            style={{
              ...EMBOSSED,
              fontFamily: 'Zen',
              fontSize: fitSize(measure, data.native.script, number, 200),
            }}
          >
            {data.native.script}
          </span>
          <svg aria-hidden="true" width={30} height={12} viewBox="0 0 30 12">
            <rect x={0} y={5} width={30} height={2} fill={LABEL} />
            <path
              d="M22.6 0.4 L28.2 6 L22.6 11.6"
              stroke={LABEL}
              strokeWidth={2}
              fill="none"
            />
          </svg>
          {target ? (
            <span
              style={{
                ...EMBOSSED,
                fontSize: fitSize(
                  measure,
                  target.name.toLocaleUpperCase(),
                  number,
                  330,
                ),
              }}
            >
              {target.name.toLocaleUpperCase()}
            </span>
          ) : null}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          position: 'absolute',
          left: 258,
          top: 200,
          maxWidth: 540,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        {data.availability ? <Label>{t('available')}</Label> : null}
        {data.availability ? (
          <span
            style={{
              ...MONO,
              ...EMBOSSED,
              fontSize: 18,
              letterSpacing: '0.1em',
            }}
          >
            {data.availability.abbr}
          </span>
        ) : null}
        <Label style={{ marginLeft: 14 }}>{data.country}</Label>
        {data.time ? (
          <span
            style={{
              ...MONO,
              ...EMBOSSED,
              fontSize: 18,
              letterSpacing: '0.1em',
            }}
          >
            {data.time}
          </span>
        ) : null}
      </div>
      {data.tags.length ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            position: 'absolute',
            left: 258,
            top: 236,
          }}
        >
          <Label>{t('interests')}</Label>
          <span
            style={{
              ...MONO,
              ...EMBOSSED,
              fontSize: 15,
              letterSpacing: '0.1em',
              maxWidth: 400,
            }}
          >
            {fitTags(
              measure,
              data.tags.map((tag) => tag.toLocaleUpperCase()),
              { size: 15, spacing: 0.1, mono: true },
              400,
            )}
          </span>
        </div>
      ) : null}
      <span
        style={{
          ...MONO,
          ...EMBOSSED,
          position: 'absolute',
          left: 44,
          bottom: 32,
          maxWidth: 700,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontSize: 22,
          letterSpacing: '0.14em',
        }}
      >
        {data.name}
      </span>
      <Avatar
        data={data}
        size={84}
        fontSize={30}
        style={{
          position: 'absolute',
          left: 817,
          top: 208,
          boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.12)',
        }}
      />
    </div>
  );
};

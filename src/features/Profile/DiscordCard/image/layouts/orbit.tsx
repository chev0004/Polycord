import { fitSize } from '../measure';
import { withAlpha } from '../palette';
import { Avatar, Brand, type CardImageProps, Chips, Kicker } from '../parts';

const CENTER_X = 744;
const CENTER_Y = 160;
const RADIUS = 150;
const RINGS = [200, 300, 420];

export const OrbitImage = ({ data, palette, measure, t }: CardImageProps) => {
  const target = data.targets[0];
  const count = data.targets.length;
  const chip = (code: string, x: number, y: number, native = false) => {
    const width = measure(code, { size: 14, weight: 800, spacing: 0.06 }) + 25;
    return (
      <span
        key={code}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'absolute',
          left: x - width / 2,
          top: y - 15,
          width,
          height: 30,
          borderRadius: 9999,
          fontSize: 14,
          fontWeight: 800,
          letterSpacing: '0.06em',
          background: native ? palette.fill : palette.darker,
          color: native ? palette.ink : palette.light,
          border: `1.5px solid ${native ? palette.primary : palette.dark}`,
        }}
      >
        {code}
      </span>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        width: 934,
        height: 320,
        padding: '36px 40px 46px',
        borderRadius: 24,
        background: palette.surface,
        overflow: 'hidden',
      }}
    >
      {RINGS.map((size) => (
        <div
          key={size}
          style={{
            position: 'absolute',
            left: CENTER_X - size / 2,
            top: CENTER_Y - size / 2,
            width: size,
            height: size,
            borderRadius: 9999,
            border: `1.5px solid ${withAlpha(palette.primary, 0.16)}`,
          }}
        />
      ))}
      <Avatar
        data={data}
        size={150}
        fontSize={50}
        style={{
          position: 'absolute',
          left: CENTER_X - 75,
          top: CENTER_Y - 75,
          boxShadow: `0 0 0 8px ${palette.surface}, 0 0 0 10px ${palette.primary}`,
        }}
      />
      {chip(data.native.code, CENTER_X, CENTER_Y - 100, true)}
      {data.targets.map((item, index) => {
        const radians = ((180 + (index * 360) / count) * Math.PI) / 180;
        return chip(
          item.code,
          CENTER_X + RADIUS * Math.cos(radians),
          CENTER_Y + RADIUS * Math.sin(radians),
        );
      })}
      <Brand
        color="#fff"
        size={11}
        style={{ position: 'absolute', left: 40, bottom: 14 }}
      />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span
          style={{
            maxWidth: 540,
            fontSize: 30,
            fontWeight: 800,
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {data.name}
        </span>
        <span
          style={{
            maxWidth: 540,
            fontSize: 16,
            color: palette.soft,
            marginTop: 4,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {[data.handle, data.availability?.text, data.country, data.time]
            .filter(Boolean)
            .join(' · ')}
        </span>
        <Chips
          tags={data.tags}
          palette={palette}
          measure={measure}
          max={CENTER_X - RADIUS - 80}
          small
          style={{ marginTop: 12 }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginTop: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <Kicker palette={palette} style={{ width: 92, flexShrink: 0 }}>
            {t('native')}
          </Kicker>
          <span
            style={{
              fontFamily: 'Zen',
              fontWeight: 700,
              fontSize: fitSize(measure, data.native.script, { size: 64 }, 380),
              lineHeight: 1.05,
              color: palette.primary,
              whiteSpace: 'nowrap',
            }}
          >
            {data.native.script}
          </span>
        </div>
        {target ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
            <Kicker palette={palette} style={{ width: 92, flexShrink: 0 }}>
              {t('learning')}
            </Kicker>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span
                style={{
                  fontSize: fitSize(
                    measure,
                    target.name,
                    { size: 56, weight: 900, spacing: -0.03 },
                    300,
                  ),
                  fontWeight: 900,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.1,
                  whiteSpace: 'nowrap',
                }}
              >
                {target.name}
              </span>
              <span style={{ fontSize: 17, color: palette.soft }}>
                {target.level}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

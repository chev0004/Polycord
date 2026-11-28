import { fitSize } from '../measure';
import { Avatar, Brand, type CardImageProps, Chips, Kicker } from '../parts';

export const DiagonalImage = ({
  data,
  active,
  palette,
  measure,
  t,
}: CardImageProps) => {
  const target = data.targets[active];
  const fit = (name: string) =>
    fitSize(measure, name, { size: 60, weight: 900, spacing: -0.03 }, 330);
  const tallest = Math.max(0, ...data.targets.map(({ name }) => fit(name)));

  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width: 934,
        height: 320,
        borderRadius: 24,
        background: palette.surface,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 541.72,
          height: 320,
          background: palette.fill,
        }}
      />
      <svg
        aria-hidden="true"
        width={544}
        height={320}
        viewBox="0 0 544 320"
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        <polygon
          points="541.72,0 544,0 544,320 392.28,320"
          fill={palette.surface}
        />
      </svg>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          position: 'absolute',
          left: 40,
          top: 34,
          maxWidth: 380,
          color: palette.ink,
        }}
      >
        <Brand color={palette.ink} size={14} style={{ marginBottom: 6 }} />
        <span
          style={{
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
            fontSize: 16,
            color: palette.ink2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {data.handle}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: 40,
          bottom: 30,
          color: palette.ink,
        }}
      >
        <Kicker palette={palette} style={{ color: palette.ink2 }}>
          {t('nativeWith', { language: data.native.name })}
        </Kicker>
        <span
          style={{
            fontFamily: 'Zen',
            fontWeight: 700,
            fontSize: fitSize(measure, data.native.script, { size: 64 }, 320),
            lineHeight: 1.05,
            marginTop: 4,
            whiteSpace: 'nowrap',
          }}
        >
          {data.native.script}
        </span>
      </div>
      <Avatar
        data={data}
        size={130}
        fontSize={44}
        style={{
          position: 'absolute',
          left: 402,
          top: 95,
          boxShadow: `0 0 0 8px ${palette.surface}`,
        }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          position: 'absolute',
          right: 40,
          top: 36,
          maxWidth: 342,
          fontSize: 15,
          lineHeight: 1.5,
          color: palette.soft,
        }}
      >
        {data.availability ? <span>{data.availability.text}</span> : null}
        <span>{[data.country, data.time].filter(Boolean).join(' · ')}</span>
        <Chips
          tags={data.tags}
          palette={palette}
          measure={measure}
          max={342}
          small
          background={palette.surface}
          style={{ justifyContent: 'flex-end', marginTop: 10 }}
        />
      </div>
      {target ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            position: 'absolute',
            right: 40,
            bottom: 30,
          }}
        >
          <Kicker palette={palette}>{t('learning')}</Kicker>
          <div
            data-motion="cycle"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              height: tallest * 1.05 + 28.4,
            }}
          >
            <span
              style={{
                fontSize: fit(target.name),
                fontWeight: 900,
                letterSpacing: '-0.03em',
                lineHeight: 1.05,
                marginTop: 4,
                whiteSpace: 'nowrap',
              }}
            >
              {target.name}
            </span>
            <span style={{ fontSize: 17, color: palette.soft, marginTop: 4 }}>
              {target.level}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
};

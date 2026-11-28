import { type Motion, slides } from '../animation';
import {
  Avatar,
  Brand,
  type CardImageProps,
  Chips,
  ICONS,
  Icon,
  Segments,
} from '../parts';
import { addColumns, clamp, difference } from '../pixels';

const MAIN = 634;
const LEVEL = 118;
const GAP = 6;
const FILL = 320;

const Level = ({
  children,
  color,
  width = LEVEL,
  motion,
}: {
  children: string;
  color: string;
  width?: number;
  motion?: string;
}) => (
  <span
    data-motion={motion}
    style={{
      display: 'flex',
      justifyContent: 'flex-end',
      width,
      fontSize: 16,
      color,
    }}
  >
    {children}
  </span>
);

export const rankMotion: Motion = async (stage) => {
  const { targets } = stage.data;
  const filled = (steps: number) => ({
    ...stage.data,
    targets: targets.map((target) => ({ ...target, steps })),
  });
  const empty = filled(0);
  const base = await stage.shot({ data: empty });
  const slide = await slides(stage, 18, { data: empty });
  const bar = difference(
    await stage.shot({ data: filled(4), lite: true }),
    await stage.shot({ data: empty, lite: true }),
  );
  const segment = (bar.width - GAP * 3) / 4;

  return {
    paint: (beat) => {
      const frame = base.slice();
      slide(frame, beat);
      const from = targets[beat.previous]?.steps ?? 0;
      const to = targets[beat.active]?.steps ?? 0;
      const duration = FILL / Math.max(1, Math.abs(to - from));
      addColumns(frame, bar, (x) => {
        const index = Math.floor(x / (segment + GAP));
        const order = to >= from ? index - from : from - 1 - index;
        const progress = clamp(
          (beat.elapsed - Math.max(0, order) * duration) / duration,
        );
        const before = Number(index < from);
        const fill = before + (Number(index < to) - before) * progress;
        return [x, clamp(fill * segment - (x - index * (segment + GAP)))];
      });
      return frame;
    },
  };
};

export const RankImage = (props: CardImageProps) => {
  const { data, active, palette, measure, t } = props;
  const target = data.targets[active];
  const codes = Math.max(
    0,
    ...data.targets.map(
      ({ code }) =>
        measure(code, { size: 15, weight: 800, spacing: 0.06 }) + 20,
    ),
  );
  const levels = Math.max(
    LEVEL,
    ...data.targets.map(({ level }) => measure(level, { size: 16 })),
  );
  const schedule = data.availability
    ? 32 + measure(data.availability.short, { size: 16 })
    : 0;

  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        alignItems: 'center',
        gap: 36,
        width: 934,
        height: 320,
        padding: '0 40px',
        borderRadius: 24,
        background: palette.deep,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          right: -120,
          top: -160,
          width: 420,
          height: 420,
          borderRadius: 9999,
          background: palette.fill,
          opacity: 0.06,
        }}
      />
      <Avatar
        data={data}
        size={184}
        fontSize={60}
        style={{
          boxShadow: `0 0 0 6px ${palette.deep}, 0 0 0 11px ${palette.primary}`,
        }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          width: MAIN,
          minWidth: 0,
        }}
      >
        <Brand color="#fff" size={13} style={{ marginBottom: -4 }} />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              minWidth: 0,
              fontSize: 38,
              fontWeight: 800,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {data.name}
            </span>
            {data.handle ? (
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 500,
                  color: palette.soft,
                  marginLeft: 10,
                }}
              >
                {data.handle}
              </span>
            ) : null}
          </div>
          {data.time ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 38, fontWeight: 800, lineHeight: 1 }}>
                {data.time}
              </span>
              <span style={{ fontSize: 15, color: palette.subtle }}>
                {t('localTime', { country: data.country })}
              </span>
            </div>
          ) : null}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            fontSize: 18,
          }}
        >
          <span style={{ fontWeight: 600 }}>{data.native.name}</span>
          <Level color={palette.soft}>{t('native')}</Level>
        </div>
        {target ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              fontSize: 18,
            }}
          >
            <div style={{ display: 'flex', width: codes }}>
              <span
                data-motion="cycle"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: 30,
                  padding: '0 10px',
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  background: palette.darker,
                  color: palette.light,
                }}
              >
                {target.code}
              </span>
            </div>
            <Segments
              steps={target.steps}
              palette={palette}
              width={MAIN - 28 - codes - levels}
            />
            <Level motion="cycle" width={levels} color={palette.soft}>
              {target.level}
            </Level>
          </div>
        ) : null}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 16,
            borderTop: `1px solid ${palette.line}`,
          }}
        >
          <Chips
            tags={data.tags}
            palette={palette}
            measure={measure}
            max={MAIN - schedule}
          />
          {data.availability ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: 16,
                color: palette.soft,
                flexShrink: 0,
              }}
            >
              <Icon path={ICONS.schedule} size={20} color={palette.primary} />
              {data.availability.short}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

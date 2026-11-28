import { DISCORD_CARD_CYCLE } from '../../types';
import { type Motion, slides } from '../animation';
import { fitSize, type Measure } from '../measure';
import { type CardPalette, withAlpha } from '../palette';
import { Avatar, Brand, type CardImageProps, Chips, Kicker } from '../parts';
import { clamp, cropSprite, drawSprite } from '../pixels';

const CENTER_X = 744;
const CENTER_Y = 160;
const RADIUS = 150;
const RINGS = [200, 300, 420];
const SPIN = 1000;
const SLOT = 80;

const easeInOutCubic = (progress: number) =>
  progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;

const Chip = ({
  code,
  x,
  y,
  native = false,
  palette,
  measure,
}: {
  code: string;
  x: number;
  y: number;
  native?: boolean;
  palette: CardPalette;
  measure: Measure;
}) => {
  const width = measure(code, { size: 14, weight: 800, spacing: 0.06 }) + 25;
  return (
    <span
      data-motion={native ? undefined : 'chips'}
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

export const orbitMotion: Motion = async (stage) => {
  const { data, count, palette, measure } = stage;
  const { targets } = data;
  const base = await stage.shot();
  const slide = await slides(stage, 16);
  const width = SLOT * count;
  const sheet = await stage.sheet(
    <div style={{ display: 'flex', position: 'relative', width, height: 30 }}>
      {targets.map(({ code }, index) => (
        <Chip
          key={code}
          code={code}
          x={index * SLOT + SLOT / 2}
          y={15}
          palette={palette}
          measure={measure}
        />
      ))}
    </div>,
    width,
    30,
  );
  const chips = targets.map((_, index) =>
    cropSprite(sheet, width, {
      x: index * SLOT,
      y: 0,
      width: SLOT,
      height: 30,
    }),
  );

  return {
    paint: ({ active, ...beat }) => {
      const frame = base.slice();
      const spun = easeInOutCubic(clamp(beat.elapsed / SPIN));
      const angle =
        beat.elapsed < DISCORD_CARD_CYCLE ? (active - 1 + spun) * -360 : 0;
      chips.forEach((chip, index) => {
        const radians = ((180 + (index * 360 + angle) / count) * Math.PI) / 180;
        drawSprite(
          frame,
          chip,
          CENTER_X + RADIUS * Math.cos(radians) - SLOT / 2,
          CENTER_Y + RADIUS * Math.sin(radians) - 15,
        );
      });
      slide(frame, { active, ...beat });
      return frame;
    },
  };
};

export const OrbitImage = ({
  data,
  active,
  palette,
  measure,
  t,
}: CardImageProps) => {
  const target = data.targets[active];
  const count = data.targets.length;
  const fit = (name: string) =>
    fitSize(measure, name, { size: 56, weight: 900, spacing: -0.03 }, 300);
  const sizes = data.targets.map(({ name }) => fit(name));

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
      <Chip
        code={data.native.code}
        x={CENTER_X}
        y={CENTER_Y - 100}
        native
        palette={palette}
        measure={measure}
      />
      {data.targets.map((item, index) => {
        const radians = ((180 + (index * 360) / count) * Math.PI) / 180;
        return (
          <Chip
            key={item.code}
            code={item.code}
            x={CENTER_X + RADIUS * Math.cos(radians)}
            y={CENTER_Y + RADIUS * Math.sin(radians)}
            palette={palette}
            measure={measure}
          />
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
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
              height: Math.max(...sizes) * 1.1,
            }}
          >
            <Kicker
              palette={palette}
              style={{
                width: 92,
                flexShrink: 0,
                marginTop: sizes[0] * 0.9 - 12.35,
              }}
            >
              {t('learning')}
            </Kicker>
            <div
              data-motion="cycle"
              style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}
            >
              <span
                style={{
                  fontSize: fit(target.name),
                  fontWeight: 900,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.1,
                  whiteSpace: 'nowrap',
                }}
              >
                {target.name}
              </span>
              <span
                style={{
                  fontSize: 17,
                  color: palette.soft,
                  marginBottom: fit(target.name) * 0.2 - 4.25,
                }}
              >
                {target.level}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

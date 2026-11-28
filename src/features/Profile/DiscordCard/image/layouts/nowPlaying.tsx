import type { ReactNode } from 'react';
import { DISCORD_CARD_CYCLE, DISCORD_CARD_WIDTH } from '../../types';
import { ease, layer, type Motion, states } from '../animation';
import { Avatar, Brand, type CardImageProps, Chips, Kicker } from '../parts';
import {
  addColumns,
  addLayer,
  clamp,
  type Pixels,
  rotateDisc,
} from '../pixels';

const RIGHT = 462;
const PAGE = 3;
const SPIN = 3200;
const LONGEST = 28000;
const FADE = 500;
const CENTER_X = 222;
const CENTER_Y = 160;
const RECORD = 128;
const AVATAR = 61;
const GROOVES = [...Array(42).keys()].map((ring) => 127 - ring * 3);
const SHEEN = [
  { middle: 75, alpha: 0.07 },
  { middle: 255, alpha: 0.05 },
];

const GLOSS = Float32Array.from({ length: (RECORD * 2) ** 2 }, (_, at) => {
  const dx = (at % (RECORD * 2)) + 0.5 - RECORD;
  const dy = Math.floor(at / (RECORD * 2)) + 0.5 - RECORD;
  const angle = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
  return SHEEN.reduce(
    (sum, { middle, alpha }) =>
      sum + alpha * clamp(1 - Math.abs(angle - middle) / 25),
    0,
  );
});

const shine = (frame: Pixels, radius: number) => {
  for (let dy = -radius; dy < radius; dy++) {
    for (let dx = -radius; dx < radius; dx++) {
      if ((dx + 0.5) ** 2 + (dy + 0.5) ** 2 > radius * radius) continue;
      const strength = GLOSS[(dy + RECORD) * RECORD * 2 + dx + RECORD];
      if (!strength) continue;
      const index = ((CENTER_Y + dy) * DISCORD_CARD_WIDTH + CENTER_X + dx) * 4;
      for (let channel = 0; channel < 3; channel++)
        frame[index + channel] += (255 - frame[index + channel]) * strength;
    }
  }
};

const loopFor = (count: number) => {
  if (count < 2) return SPIN;
  const cycle = count * DISCORD_CARD_CYCLE;
  const drift = (loop: number) =>
    Math.abs(loop / Math.round(loop / SPIN) - SPIN);
  return states(Math.floor(LONGEST / cycle))
    .map((repeat) => cycle * (repeat + 1))
    .sort((a, b) => drift(a) - drift(b))[0];
};

export const nowPlayingMotion: Motion = async (stage) => {
  const { count } = stage;
  const loop = loopFor(count);
  const turns = Math.round(loop / SPIN);
  const record = await stage.shot();
  const base = record.slice();
  shine(base, RECORD);
  const page = (index: number) => Math.floor(index / PAGE);
  const rows = await Promise.all(
    states(count).map(async (active) => {
      const previous = (active + count - 1) % count;
      return {
        settled: await layer(stage, 'rows', { active }, {}),
        turning:
          count > 1 && page(previous) === page(active)
            ? await layer(stage, 'rows', { active, lit: previous }, {})
            : undefined,
      };
    }),
  );
  const bar = await layer(stage, 'bar');

  return {
    continuous: loop,
    paint: ({ time, active, elapsed }) => {
      const frame = base.slice();
      rotateDisc(
        frame,
        record,
        CENTER_X,
        CENTER_Y,
        AVATAR,
        (360 * turns * time) / loop,
      );
      shine(frame, AVATAR);
      const { settled, turning } = rows[active];
      const fade = turning ? ease(elapsed / FADE) : 1;
      addLayer(frame, settled, fade);
      if (turning) addLayer(frame, turning, 1 - fade);
      const progress = elapsed / DISCORD_CARD_CYCLE;
      addColumns(frame, bar, (x) => [
        Math.floor((x + 0.5) / progress),
        clamp(progress * bar.width - x),
      ]);
      return frame;
    },
  };
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
        alignItems: 'baseline',
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
  active,
  lit = active,
  palette,
  measure,
  t,
}: CardImageProps) => {
  const page = Math.floor(active / PAGE) * PAGE;
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
          <div
            data-motion="rows"
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            {data.targets.slice(page, page + PAGE).map((track, index) => (
              <Track
                key={track.code}
                code={`B${page + index + 1}`}
                level={track.level}
                color={page + index === lit ? '#fff' : palette.subtle}
                codeColor={
                  page + index === active ? palette.primary : undefined
                }
                bold={page + index === active}
              >
                <span>{track.name}</span>
              </Track>
            ))}
          </div>
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
              background: palette.darker,
              overflow: 'hidden',
            }}
          >
            <div
              data-motion="bar"
              style={{ width: RIGHT, height: 4, background: palette.fill }}
            />
          </div>
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

import type { CSSProperties, ReactNode } from 'react';
import { bezier, type Motion, shifts, slides } from '../animation';
import { fitSize } from '../measure';
import type { CardPalette } from '../palette';
import { Brand, type CardImageProps, Chips, Segments } from '../parts';
import { addLayer, cropSprite, drawSprite } from '../pixels';

const RIGHT = 550;
const PAGE = 3;
const STEP = 134;
const MOVE = 450;
const LEFT = 352;
const MARGIN = { x: 10, y: 20 };
const glide = bezier(0.7, 0, 0.2, 1.3);
const topHeight = (tags: string[]) => (tags.length ? 52 : 50);
const slot = (index: number) => STEP * ((index % PAGE) + 1);

const Cursor = ({
  palette,
  label,
  style,
}: {
  palette: CardPalette;
  label: string;
  style: CSSProperties;
}) => (
  <div
    data-motion="cursor"
    style={{
      display: 'flex',
      justifyContent: 'center',
      position: 'absolute',
      width: 122,
      height: 104,
      borderRadius: 12,
      boxShadow: `0 0 0 3px ${palette.primary}, 0 0 0 7px ${palette.deep}`,
      ...style,
    }}
  >
    <span
      style={{
        position: 'absolute',
        top: -15,
        padding: '1px 8px',
        borderRadius: 3,
        background: palette.fill,
        color: palette.ink,
        fontSize: 12,
        fontWeight: 900,
        fontStyle: 'italic',
      }}
    >
      {label}
    </span>
  </div>
);

export const characterSelectMotion: Motion = async (stage) => {
  const base = await stage.shot();
  const slide = await slides(stage, 16, { varies: true });
  const moved = await shifts(stage);
  const size = { width: 142, height: 135 };
  const sheet = await stage.sheet(
    <div style={{ display: 'flex', position: 'relative', ...size }}>
      <Cursor
        palette={stage.palette}
        label={stage.t('player')}
        style={{ left: MARGIN.x, top: MARGIN.y }}
      />
    </div>,
    size.width,
    size.height,
  );
  const cursor = cropSprite(sheet, size.width, { x: 0, y: 0, ...size });
  const top = 26 + topHeight(stage.data.tags) + 22;

  return {
    paint: (beat) => {
      const frame = base.slice();
      addLayer(frame, moved[beat.active]);
      slide(frame, beat);
      const from = slot(beat.previous);
      const x = from + (slot(beat.active) - from) * glide(beat.elapsed / MOVE);
      drawSprite(frame, cursor, LEFT + x - MARGIN.x, top - MARGIN.y);
      return frame;
    },
  };
};

const Tile = ({
  background,
  label,
  labelColor,
  children,
}: {
  background: string;
  label: string;
  labelColor: string;
  children: ReactNode;
}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      width: 122,
      height: 104,
      padding: '12px 14px',
      borderRadius: 12,
      background,
    }}
  >
    {children}
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: labelColor,
      }}
    >
      {label}
    </span>
  </div>
);

export const CharacterSelectImage = ({
  data,
  active,
  palette,
  measure,
  t,
}: CardImageProps) => {
  const target = data.targets[active];
  const page = Math.floor(active / PAGE) * PAGE;
  const id = Math.min(
    210,
    Math.max(
      measure(data.name.toUpperCase(), { size: 28, weight: 900 }),
      measure(data.handle, { size: 14 }),
    ),
  );
  const word = target?.name.toUpperCase() ?? '';

  return (
    <div
      style={{
        display: 'flex',
        width: 934,
        height: 320,
        borderRadius: 24,
        overflow: 'hidden',
        background: palette.deep,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          width: 320,
          height: 320,
          background: '#4a90c4',
          overflow: 'hidden',
        }}
      >
        {data.avatarUrl ? (
          // biome-ignore lint/performance/noImgElement: Satori renders plain img elements
          <img
            src={data.avatarUrl}
            width={320}
            height={320}
            alt=""
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <span
            style={{
              fontSize: 150,
              fontWeight: 900,
              letterSpacing: '-0.04em',
              lineHeight: 1,
            }}
          >
            {data.initials}
          </span>
        )}
        <Brand
          color={palette.ink}
          size={15}
          style={{ position: 'absolute', left: 18, bottom: 14 }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 614,
          padding: '26px 32px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            height: topHeight(data.tags),
            gap: 12,
            fontSize: 14,
            lineHeight: 1.45,
            color: palette.subtle,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
              maxWidth: 210,
            }}
          >
            <span
              style={{
                fontSize: 28,
                fontWeight: 900,
                fontStyle: 'italic',
                textTransform: 'uppercase',
                lineHeight: 1.05,
                color: '#fff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {data.name}
            </span>
            <span
              style={{
                fontSize: 14,
                color: palette.soft,
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
              alignItems: 'flex-end',
              gap: 6,
              minWidth: 0,
            }}
          >
            <Chips
              tags={data.tags}
              palette={palette}
              measure={measure}
              max={RIGHT - 12 - id}
              small
            />
            <span>
              {[data.availability?.text, data.country, data.time]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            position: 'relative',
            gap: 12,
            marginTop: 22,
          }}
        >
          <Tile
            background={palette.fill}
            label={t('homeNative')}
            labelColor={palette.ink2}
          >
            <span
              style={{
                fontFamily: 'Zen',
                fontWeight: 700,
                fontSize: fitSize(
                  measure,
                  data.native.script,
                  { size: 30 },
                  94,
                ),
                lineHeight: 1,
                color: palette.ink,
                whiteSpace: 'nowrap',
              }}
            >
              {data.native.script}
            </span>
          </Tile>
          {data.targets.slice(page, page + PAGE).map((item) => (
            <Tile
              key={item.code}
              background="#1e2328"
              label={item.name}
              labelColor={palette.soft}
            >
              <span
                style={{
                  fontSize: 34,
                  fontWeight: 900,
                  fontStyle: 'italic',
                  lineHeight: 1,
                }}
              >
                {item.code}
              </span>
            </Tile>
          ))}
          <Cursor
            palette={palette}
            label={t('player')}
            style={{ left: slot(active), top: 0 }}
          />
        </div>
        {target ? (
          <div
            data-motion="cycle"
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 22,
              marginTop: 'auto',
            }}
          >
            <span
              style={{
                fontSize: fitSize(
                  measure,
                  word,
                  { size: 46, weight: 900, spacing: -0.01 },
                  360,
                ),
                fontWeight: 900,
                fontStyle: 'italic',
                letterSpacing: '-0.01em',
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {word}
            </span>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                paddingBottom: 4,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: palette.soft,
                  textTransform: 'uppercase',
                }}
              >
                {t('levelShort', { level: target.level })}
              </span>
              <Segments
                steps={target.steps}
                palette={palette}
                width={140}
                height={10}
                off="#2b3138"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

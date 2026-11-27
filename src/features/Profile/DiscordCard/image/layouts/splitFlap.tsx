import type { CSSProperties, ReactNode } from 'react';
import type { CardPalette } from '../palette';
import { Avatar, Brand, type CardImageProps, Chips, Kicker } from '../parts';

const MAX_WORD_LENGTH = 18;
const SMALL_WORD_LENGTH = 9;
const MEDIUM_WORD_LENGTH = 15;

const SIZES = {
  large: { width: 46, height: 64, font: 38, radius: 6, gap: 5 },
  small: { width: 28, height: 40, font: 22, radius: 4, gap: 3 },
  tiny: { width: 24, height: 34, font: 18, radius: 3, gap: 2 },
  clock: { width: 26, height: 36, font: 21, radius: 4, gap: 3 },
};

const clip = (word: string) =>
  word.length > MAX_WORD_LENGTH
    ? `${word.slice(0, MAX_WORD_LENGTH - 1)}…`
    : word;

const flapSize = (width: number) => {
  if (width > MEDIUM_WORD_LENGTH) return SIZES.tiny;
  return width > SMALL_WORD_LENGTH ? SIZES.small : SIZES.large;
};

const Cell = ({
  char,
  size,
  color,
}: {
  char: string;
  size: (typeof SIZES)[keyof typeof SIZES];
  color: string;
}) => (
  <div
    style={{
      display: 'flex',
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      width: size.width,
      height: size.height,
      borderRadius: size.radius,
      background: 'linear-gradient(180deg, #22272d 50%, #1a1e22 50%)',
      boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.04)',
      fontSize: size.font,
      fontWeight: 800,
      lineHeight: 1,
      color,
    }}
  >
    {char.trim() ? char : null}
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: size.height / 2 - 1,
        height: 2,
        background: '#0a0b0c',
      }}
    />
  </div>
);

const Flaps = ({
  word,
  width,
  size,
  color = '#fff',
}: {
  word: string;
  width: number;
  size: (typeof SIZES)[keyof typeof SIZES];
  color?: string;
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: size.gap }}>
    {[...word.toLocaleUpperCase().padEnd(width, ' ')].map((char, index) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: flap cells are positional
      <Cell key={index} char={char} size={size} color={color} />
    ))}
  </div>
);

const Line = ({
  label,
  palette,
  children,
  style,
}: {
  label: string;
  palette: CardPalette;
  children: ReactNode;
  style?: CSSProperties;
}) => (
  <div style={{ display: 'flex', alignItems: 'center', ...style }}>
    <Kicker palette={palette} style={{ width: 96, flexShrink: 0 }}>
      {label}
    </Kicker>
    {children}
  </div>
);

export const SplitFlapImage = ({
  data,
  palette,
  measure,
  t,
}: CardImageProps) => {
  const target = data.targets[0];
  const native = clip(data.native.name);
  const nameWidth = Math.max(
    1,
    ...data.targets.map((item) => clip(item.name).length),
  );
  const levelWidth = Math.max(
    1,
    ...data.targets.map((item) => item.level.length),
  );

  return (
    <div
      style={{
        display: 'flex',
        gap: 36,
        width: 934,
        height: 320,
        padding: '30px 36px',
        borderRadius: 24,
        background: palette.deep,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 14,
          width: 576,
          overflow: 'hidden',
        }}
      >
        <Line label={t('speaks')} palette={palette}>
          <Flaps
            word={native}
            width={native.length}
            size={flapSize(native.length)}
            color={palette.primary}
          />
        </Line>
        {target ? (
          <Line label={t('learning')} palette={palette}>
            <Flaps
              word={clip(target.name)}
              width={nameWidth}
              size={flapSize(nameWidth)}
            />
          </Line>
        ) : null}
        {target ? (
          <Line label={t('level')} palette={palette}>
            <Flaps word={target.level} width={levelWidth} size={SIZES.small} />
          </Line>
        ) : null}
        {data.tags.length ? (
          <Line
            label={t('interests')}
            palette={palette}
            style={{ marginTop: 4 }}
          >
            <Chips
              tags={data.tags}
              palette={palette}
              measure={measure}
              max={480}
              small
            />
          </Line>
        ) : null}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          width: 250,
          paddingLeft: 30,
          borderLeft: `1px dashed ${palette.dark}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar data={data} size={64} fontSize={24} />
          <div
            style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}
          >
            <span
              style={{
                fontSize: 24,
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
                fontSize: 15,
                color: palette.soft,
                marginTop: 2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {data.handle}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', marginTop: 'auto' }} />
        {data.availability ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <Kicker palette={palette} style={{ fontSize: 12 }}>
              {t('freeTime')}
            </Kicker>
            <span style={{ fontSize: 18, fontWeight: 700, whiteSpace: 'pre' }}>
              {`${data.availability.days} ${data.availability.range}`}
            </span>
          </div>
        ) : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <Kicker palette={palette} style={{ fontSize: 12 }}>
            {data.time
              ? t('localTimeIn', { country: data.country })
              : data.country}
          </Kicker>
          {data.time ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {[...data.time].map((char, index) =>
                char === ':' ? (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: clock cells are positional
                    key={index}
                    style={{
                      fontSize: 21,
                      fontWeight: 800,
                      color: palette.subtle,
                      padding: '0 2px',
                    }}
                  >
                    :
                  </span>
                ) : (
                  <Cell
                    // biome-ignore lint/suspicious/noArrayIndexKey: clock cells are positional
                    key={index}
                    char={char}
                    size={SIZES.clock}
                    color="#fff"
                  />
                ),
              )}
            </div>
          ) : null}
        </div>
        <Brand color="#fff" size={13} />
      </div>
    </div>
  );
};

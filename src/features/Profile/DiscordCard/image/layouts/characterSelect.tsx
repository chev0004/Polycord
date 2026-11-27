import type { ReactNode } from 'react';
import { fitSize } from '../measure';
import { Brand, type CardImageProps, Chips, Segments } from '../parts';

const RIGHT = 550;

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
  palette,
  measure,
  t,
}: CardImageProps) => {
  const target = data.targets[0];
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
          {data.targets.slice(0, 3).map((item) => (
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
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              position: 'absolute',
              left: 134,
              top: 0,
              width: 122,
              height: 104,
              borderRadius: 12,
              boxShadow: `0 0 0 3px ${palette.primary}, 0 0 0 7px ${palette.deep}`,
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
              {t('player')}
            </span>
          </div>
        </div>
        {target ? (
          <div
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

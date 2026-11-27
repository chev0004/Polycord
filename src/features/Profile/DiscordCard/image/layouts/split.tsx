import { fitSize } from '../measure';
import { Avatar, Brand, type CardImageProps, Chips, Kicker } from '../parts';

const RIGHT = 514;

export const SplitImage = ({ data, palette, measure, t }: CardImageProps) => {
  const target = data.targets[0];
  const who = Math.min(
    RIGHT * 0.6,
    Math.max(
      measure(data.name, { size: 26, weight: 800 }),
      measure(data.handle, { size: 17 }),
    ),
  );

  return (
    <div
      style={{
        display: 'flex',
        width: 934,
        height: 320,
        borderRadius: 28,
        overflow: 'hidden',
        background: palette.surface,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 340,
          padding: 32,
          background: palette.fill,
          color: palette.ink,
        }}
      >
        <Brand
          color={palette.ink}
          size={18}
          style={{ alignSelf: 'flex-start' }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 'auto',
          }}
        >
          <Kicker palette={palette} style={{ color: palette.ink2 }}>
            {t('native')}
          </Kicker>
          <span
            style={{
              fontFamily: 'Zen',
              fontWeight: 700,
              fontSize: fitSize(
                measure,
                data.native.script,
                { size: 80, spacing: -0.02 },
                276,
              ),
              lineHeight: 1,
              letterSpacing: '-0.02em',
              marginTop: 8,
              whiteSpace: 'nowrap',
            }}
          >
            {data.native.script}
          </span>
          {data.native.script !== data.native.name ? (
            <span style={{ fontSize: 17, color: palette.ink2, marginTop: 8 }}>
              {data.native.name}
            </span>
          ) : null}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 594,
          padding: '30px 40px',
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar data={data} size={56} fontSize={22} />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              maxWidth: RIGHT * 0.6,
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: 26,
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
                fontSize: 17,
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
              flex: 1,
              justifyContent: 'flex-end',
              minWidth: 0,
            }}
          >
            <Chips
              tags={data.tags}
              palette={palette}
              measure={measure}
              max={RIGHT - 56 - 32 - who}
              small
            />
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 'auto',
          }}
        >
          <Kicker palette={palette}>{t('learning')}</Kicker>
          {target ? (
            <span
              style={{
                fontSize: fitSize(
                  measure,
                  target.name,
                  { size: 68, weight: 900, spacing: -0.03 },
                  510,
                ),
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: '-0.03em',
                marginTop: 8,
                whiteSpace: 'nowrap',
              }}
            >
              {target.name}
            </span>
          ) : null}
          {target ? (
            <span style={{ fontSize: 17, color: palette.soft, marginTop: 8 }}>
              {target.level}
            </span>
          ) : null}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 28,
            marginTop: 18,
            paddingTop: 14,
            borderTop: `1px solid ${palette.line}`,
            fontSize: 16,
            color: palette.soft,
            whiteSpace: 'pre',
          }}
        >
          {data.availability ? (
            <span style={{ display: 'flex' }}>
              <span style={{ color: '#fff', fontWeight: 600 }}>
                {data.availability.days}
              </span>
              <span>{` ${data.availability.range}`}</span>
            </span>
          ) : null}
          <span style={{ display: 'flex' }}>
            <span style={{ color: '#fff', fontWeight: 600 }}>
              {data.country}
            </span>
            {data.time ? <span>{` · ${data.time}`}</span> : null}
          </span>
        </div>
      </div>
    </div>
  );
};

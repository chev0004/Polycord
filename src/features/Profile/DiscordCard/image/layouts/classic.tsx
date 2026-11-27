import {
  Avatar,
  Brand,
  type CardImageProps,
  Chips,
  LocationRow,
  ScheduleRow,
} from '../parts';

const RIGHT_COLUMN = 387.6;

export const ClassicImage = (props: CardImageProps) => {
  const { data, palette, measure, t } = props;
  const target = data.targets[0];

  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width: 934,
        height: 320,
        borderRadius: 28,
        background: palette.surface,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          left: 0,
          top: 0,
          width: 934,
          height: 96,
          background: palette.fill,
        }}
      >
        <Brand
          color={palette.ink}
          size={20}
          style={{ position: 'absolute', right: 28, top: 26 }}
        />
      </div>
      <Avatar
        data={data}
        size={120}
        fontSize={42}
        style={{
          position: 'absolute',
          left: 40,
          top: 40,
          boxShadow: `0 0 0 8px ${palette.surface}`,
        }}
      />
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          left: 40,
          right: 40,
          top: 172,
          bottom: 26,
          gap: 40,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 426.4,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {data.name}
          </div>
          <div style={{ fontSize: 18, color: palette.soft, marginTop: 2 }}>
            {data.handle}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                height: 38,
                padding: '0 14px',
                borderRadius: 9999,
                background: palette.fill,
                color: palette.ink,
                fontSize: 17,
                fontWeight: 600,
                minWidth: 0,
                flexShrink: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {data.native.script !== data.native.name ? (
                <span style={{ fontFamily: 'Zen' }}>{data.native.script}</span>
              ) : null}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {data.native.name}
              </span>
            </div>
            {target ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  height: 38,
                  padding: '0 14px',
                  borderRadius: 9999,
                  background: palette.darker,
                  color: palette.light,
                  fontSize: 17,
                  fontWeight: 600,
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{target.name}</span>
                {target.level ? (
                  <span style={{ fontSize: 15, fontWeight: 500, opacity: 0.8 }}>
                    {`· ${target.level}`}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            width: RIGHT_COLUMN,
            minWidth: 0,
          }}
        >
          <ScheduleRow {...props} />
          <LocationRow
            {...props}
            currently={(time) => t('currently', { time })}
          />
          <Chips
            tags={data.tags}
            palette={palette}
            measure={measure}
            max={RIGHT_COLUMN}
          />
        </div>
      </div>
    </div>
  );
};

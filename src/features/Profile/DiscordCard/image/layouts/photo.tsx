import {
  Brand,
  type CardImageProps,
  Chips,
  Kicker,
  LocationRow,
  ScheduleRow,
} from '../parts';

export const PhotoImage = ({ data, palette, measure, t }: CardImageProps) => {
  const target = data.targets[0];

  return (
    <div
      style={{
        display: 'flex',
        width: 934,
        height: 320,
        borderRadius: 24,
        overflow: 'hidden',
        background: palette.surface,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 320,
          height: 320,
          background: '#4a90c4',
          fontSize: 96,
          fontWeight: 800,
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
          data.initials
        )}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          width: 614,
          padding: '30px 40px',
        }}
      >
        <Brand
          color="#fff"
          size={15}
          style={{ position: 'absolute', right: 32, top: 28 }}
        />
        <span
          style={{
            fontSize: 42,
            fontWeight: 800,
            lineHeight: 1.05,
            marginRight: 130,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {data.name}
        </span>
        <span
          style={{
            fontSize: 18,
            color: palette.soft,
            marginTop: 4,
            marginRight: 130,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {data.handle}
        </span>
        <Chips
          tags={data.tags}
          palette={palette}
          measure={measure}
          max={534}
          small
          style={{ marginTop: 12 }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            marginTop: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Kicker palette={palette} style={{ width: 110 }}>
              {t('speaks')}
            </Kicker>
            <span
              style={{
                display: 'flex',
                fontSize: 26,
                fontWeight: 700,
                whiteSpace: 'pre',
              }}
            >
              {data.native.script !== data.native.name ? (
                <span style={{ fontFamily: 'Zen', color: palette.primary }}>
                  {`${data.native.script} `}
                </span>
              ) : null}
              <span>{data.native.name}</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Kicker palette={palette} style={{ width: 110 }}>
              {t('learning')}
            </Kicker>
            {target ? (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 26,
                  fontWeight: 700,
                }}
              >
                <span>{target.name}</span>
                {target.level ? (
                  <span
                    style={{
                      fontSize: 17,
                      fontWeight: 500,
                      color: palette.soft,
                    }}
                  >
                    {`· ${target.level}`}
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 28,
            marginTop: 20,
            paddingTop: 16,
            borderTop: `1px solid ${palette.line}`,
          }}
        >
          <ScheduleRow data={data} palette={palette} size={16} iconSize={20} />
          <LocationRow data={data} palette={palette} size={16} iconSize={20} />
        </div>
      </div>
    </div>
  );
};

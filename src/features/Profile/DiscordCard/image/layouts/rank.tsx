import {
  Avatar,
  Brand,
  type CardImageProps,
  Chips,
  ICONS,
  Icon,
  Segments,
} from '../parts';

const MAIN = 634;

const Level = ({ children, color }: { children: string; color: string }) => (
  <span
    style={{
      display: 'flex',
      justifyContent: 'flex-end',
      minWidth: 118,
      fontSize: 16,
      color,
    }}
  >
    {children}
  </span>
);

export const RankImage = (props: CardImageProps) => {
  const { data, palette, measure, t } = props;
  const target = data.targets[0];
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
            <span
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
            <div style={{ display: 'flex', flex: 1 }}>
              <Segments
                steps={target.steps}
                palette={palette}
                width={
                  MAIN -
                  28 -
                  118 -
                  (measure(target.code, {
                    size: 15,
                    weight: 800,
                    spacing: 0.06,
                  }) +
                    20)
                }
              />
            </div>
            <Level color={palette.soft}>{target.level}</Level>
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

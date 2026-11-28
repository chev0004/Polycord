import { Avatar, Brand, type CardImageProps, Chips, Kicker } from '../parts';

export const WatermarkImage = ({
  data,
  active,
  palette,
  measure,
  t,
}: CardImageProps) => {
  const target = data.targets[active];
  const footer = [
    data.availability?.text,
    [data.country, data.time].filter(Boolean).join(' · '),
  ].filter((text): text is string => Boolean(text));
  const footerWidth = footer.reduce(
    (sum, text) => sum + measure(text, { size: 16 }) + 24,
    0,
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        width: 934,
        height: 320,
        padding: '32px 40px',
        borderRadius: 24,
        background: palette.deep,
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          position: 'absolute',
          right: -20,
          bottom: -56,
          fontFamily: 'Zen',
          fontWeight: 700,
          fontSize: 220,
          lineHeight: 1,
          letterSpacing: '-0.04em',
          color: palette.darker,
          whiteSpace: 'nowrap',
        }}
      >
        {data.native.script}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <Avatar data={data} size={80} fontSize={28} />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span
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
          </span>
          <span
            style={{
              fontSize: 18,
              color: palette.soft,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {data.handle}
          </span>
        </div>
        <Brand
          color="#fff"
          size={16}
          style={{ marginLeft: 'auto', alignSelf: 'flex-start' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 56, marginTop: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Kicker palette={palette}>{t('native')}</Kicker>
          <span
            style={{
              fontSize: 34,
              fontWeight: 800,
              lineHeight: 1.1,
              color: palette.primary,
            }}
          >
            {data.native.name}
          </span>
          {data.native.script !== data.native.name ? (
            <span style={{ fontSize: 16, color: palette.soft }}>
              {data.native.script}
            </span>
          ) : null}
        </div>
        {target ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Kicker palette={palette}>{t('learning')}</Kicker>
            <div
              data-motion="cycle"
              style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
            >
              <span style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.1 }}>
                {target.name}
              </span>
              <span style={{ fontSize: 16, color: palette.soft }}>
                {target.level}
              </span>
            </div>
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          marginTop: 22,
          fontSize: 16,
          color: palette.soft,
        }}
      >
        {footer.map((text) => (
          <span key={text}>{text}</span>
        ))}
        <Chips
          tags={data.tags}
          palette={palette}
          measure={measure}
          max={854 - footerWidth}
          small
          style={{ marginLeft: 'auto' }}
        />
      </div>
    </div>
  );
};

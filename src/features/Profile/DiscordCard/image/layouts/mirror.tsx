import { fitSize } from '../measure';
import { Avatar, Brand, type CardImageProps, Chips, Kicker } from '../parts';

export const MirrorImage = ({
  data,
  active,
  palette,
  measure,
  t,
}: CardImageProps) => {
  const target = data.targets[active];
  const fit = (name: string) =>
    fitSize(measure, name, { size: 60, weight: 900, spacing: -0.03 }, 300);
  const tallest = Math.max(0, ...data.targets.map(({ name }) => fit(name)));
  const center = Math.min(
    260,
    Math.max(
      140,
      measure(data.name, { size: 26, weight: 800 }),
      measure(data.handle, { size: 16 }),
    ),
  );
  const side = (934 - 96 - 72 - center) / 2;
  const footer = [
    data.availability?.text,
    [data.country, data.time].filter(Boolean).join(' · '),
  ].filter((text): text is string => Boolean(text));
  const footerWidth = footer.reduce(
    (sum, text) => sum + measure(text, { size: 15 }) + 18,
    0,
  );

  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        alignItems: 'center',
        gap: 36,
        width: 934,
        height: 320,
        padding: '0 48px 28px',
        borderRadius: 24,
        background: palette.surface,
      }}
    >
      <Brand
        color="#fff"
        size={14}
        style={{ position: 'absolute', left: 28, top: 20 }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          width: side,
        }}
      >
        <Kicker palette={palette}>{t('speaks')}</Kicker>
        <span
          style={{
            fontFamily: 'Zen',
            fontWeight: 700,
            fontSize: fitSize(measure, data.native.script, { size: 72 }, 300),
            lineHeight: 1.05,
            color: palette.primary,
            marginTop: 6,
            whiteSpace: 'nowrap',
          }}
        >
          {data.native.script}
        </span>
        <span style={{ fontSize: 17, color: palette.soft, marginTop: 8 }}>
          {t('nativeSuffix', { language: data.native.name })}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: center,
        }}
      >
        <Avatar
          data={data}
          size={140}
          fontSize={48}
          style={{
            boxShadow: `0 0 0 6px ${palette.surface}, 0 0 0 10px ${palette.primary}`,
          }}
        />
        <span
          style={{
            maxWidth: 260,
            fontSize: 26,
            fontWeight: 800,
            marginTop: 20,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {data.name}
        </span>
        <span
          style={{
            maxWidth: 260,
            fontSize: 16,
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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          width: side,
        }}
      >
        <Kicker palette={palette}>{t('learning')}</Kicker>
        {target ? (
          <div
            data-motion="cycle"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              height: tallest * 1.1 + 34.4,
            }}
          >
            <span
              style={{
                fontSize: fit(target.name),
                fontWeight: 900,
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                marginTop: 6,
                whiteSpace: 'nowrap',
              }}
            >
              {target.name}
            </span>
            <span style={{ fontSize: 17, color: palette.soft, marginTop: 8 }}>
              {target.level}
            </span>
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 18,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 20,
          fontSize: 15,
          color: palette.subtle,
        }}
      >
        {footer.map((text) => (
          <span key={text}>{text}</span>
        ))}
        <Chips
          tags={data.tags}
          palette={palette}
          measure={measure}
          max={934 - footerWidth}
          small
        />
      </div>
    </div>
  );
};

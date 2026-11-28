import type { CSSProperties, ReactNode } from 'react';
import {
  Avatar,
  Brand,
  type CardImageProps,
  Chips,
  ICONS,
  Kicker,
  Row,
  Strong,
} from '../parts';

const Bubble = ({
  label,
  greeting,
  style,
  labelColor,
  motion,
}: {
  label: ReactNode;
  greeting: string;
  style: CSSProperties;
  labelColor?: string;
  motion?: string;
}) => (
  <div style={{ display: 'flex', padding: '14px 22px', ...style }}>
    <div
      data-motion={motion}
      style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
    >
      {label}
      <span
        style={{
          fontFamily: 'Zen',
          fontSize: 34,
          fontWeight: 700,
          lineHeight: 1.15,
          color: labelColor,
        }}
      >
        {greeting}
      </span>
    </div>
  </div>
);

export const GreetingImage = ({
  data,
  active,
  palette,
  measure,
  t,
}: CardImageProps) => {
  const target = data.targets[active];
  const learning =
    44 +
    Math.max(
      0,
      ...data.targets.flatMap((item) => [
        measure(t('learningWith', { language: item.name }).toUpperCase(), {
          size: 13,
          weight: 700,
          spacing: 0.12,
        }),
        measure(item.greeting, { size: 34, zen: true }),
      ]),
    );

  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
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
          gap: 6,
          width: 300,
          padding: 32,
          background: palette.deep,
          borderRight: `1px solid ${palette.dark}`,
        }}
      >
        <Avatar
          data={data}
          size={96}
          fontSize={34}
          style={{ marginBottom: 10 }}
        />
        <span
          style={{
            fontSize: 28,
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
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginTop: 'auto',
          }}
        >
          {data.availability ? (
            <Row
              icon={ICONS.schedule}
              palette={palette}
              size={17}
              iconSize={22}
            >
              <Strong>{data.availability.days}</Strong>
              <span>{` ${data.availability.rangeShort}`}</span>
            </Row>
          ) : null}
          {data.country || data.time ? (
            <Row
              icon={ICONS.location}
              palette={palette}
              size={17}
              iconSize={22}
            >
              {data.country ? <Strong>{data.country}</Strong> : null}
              {data.country && data.time ? <span> · </span> : null}
              {data.time ? <span>{data.time}</span> : null}
            </Row>
          ) : null}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 14,
          width: 634,
          padding: '24px 32px',
        }}
      >
        <Bubble
          label={
            <Kicker palette={palette} style={{ color: palette.ink2 }}>
              {t('nativeWith', { language: data.native.name })}
            </Kicker>
          }
          greeting={data.native.greeting}
          labelColor={palette.ink}
          style={{
            alignSelf: 'flex-start',
            background: palette.fill,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            borderBottomRightRadius: 26,
            borderBottomLeftRadius: 8,
          }}
        />
        {target ? (
          <Bubble
            motion="cycle"
            label={
              <Kicker palette={palette}>
                {t('learningWith', { language: target.name })}
              </Kicker>
            }
            greeting={target.greeting}
            style={{
              alignSelf: 'flex-end',
              minWidth: learning,
              background: palette.darker,
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              borderBottomRightRadius: 8,
              borderBottomLeftRadius: 26,
            }}
          />
        ) : null}
        <Chips
          tags={data.tags}
          palette={palette}
          measure={measure}
          max={570}
          small
          style={{ alignSelf: 'flex-end' }}
        />
      </div>
      <Brand
        color="#fff"
        size={14}
        style={{ position: 'absolute', right: 28, top: 14 }}
      />
    </div>
  );
};

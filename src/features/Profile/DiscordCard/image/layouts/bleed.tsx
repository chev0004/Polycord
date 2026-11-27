import type { Measure } from '../measure';
import { fitSize } from '../measure';
import { Avatar, Brand, type CardImageProps, Chips, Kicker } from '../parts';

const TOP_OFFSET = 0.19;
const OUTLINE = [...Array(16).keys()].map((step) => [
  2 * Math.cos((step * Math.PI) / 8),
  2 * Math.sin((step * Math.PI) / 8),
]);
const BASE = 210;

const fitLines = (measure: Measure, text: string) => {
  const style = { size: BASE, spacing: -0.04 };
  const words = text.split(' ');
  const split = words
    .slice(1)
    .map((_, index) => [
      words.slice(0, index + 1).join(' '),
      words.slice(index + 1).join(' '),
    ])
    .map((pair) => ({
      pair,
      width: Math.max(...pair.map((line) => measure(line, style))),
    }))
    .sort((a, b) => a.width - b.width)[0];
  const single = fitSize(measure, text, style, 640);
  const double = split
    ? Math.min(BASE, (640 * BASE) / split.width, 170 / (2 - TOP_OFFSET))
    : 0;
  const lines = double > single && split ? split.pair : [text];
  const size = double > single ? double : single;
  const overhang = /[gjpqy]/.test(lines.at(-1) ?? '') ? 0.12 * size + 6 : 0;
  return { lines, size, bottom: (lines.length - TOP_OFFSET) * size + overhang };
};

export const BleedImage = ({ data, palette, measure, t }: CardImageProps) => {
  const target = data.targets[0];
  const name = fitLines(measure, data.native.script);
  const learn = Math.max(136, 306 - name.bottom);

  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width: 934,
        height: 320,
        borderRadius: 24,
        background: palette.deep,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: -10,
          top: -TOP_OFFSET * name.size,
          fontFamily: 'Zen',
          fontWeight: 700,
          fontSize: name.size,
          lineHeight: 1,
          letterSpacing: '-0.04em',
          whiteSpace: 'nowrap',
          color: palette.primary,
        }}
      >
        {name.lines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </div>
      <Kicker
        palette={palette}
        style={{ position: 'absolute', left: 40, top: name.bottom - 8 }}
      >
        {t('nativeWith', { language: data.native.name })}
      </Kicker>
      {target ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            position: 'absolute',
            left: 36,
            bottom: -34,
          }}
        >
          <Kicker palette={palette} style={{ paddingLeft: 4 }}>
            {t('learningLevel', { level: target.level })}
          </Kicker>
          <span
            style={{
              fontSize: fitSize(
                measure,
                target.name,
                { size: learn, weight: 900, spacing: -0.04 },
                600,
              ),
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '-0.04em',
              color: palette.deep,
              textShadow: OUTLINE.map(
                ([x, y]) => `${x}px ${y}px 0 ${palette.primary}`,
              ).join(', '),
              whiteSpace: 'nowrap',
            }}
          >
            {target.name}
          </span>
        </div>
      ) : null}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          position: 'absolute',
          right: 36,
          top: 24,
          bottom: 58,
          width: 240,
        }}
      >
        <Avatar
          data={data}
          size={72}
          fontSize={26}
          style={{ marginBottom: 10 }}
        />
        <span
          style={{
            maxWidth: 240,
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
            maxWidth: 240,
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
        <Chips
          tags={data.tags}
          palette={palette}
          measure={measure}
          max={240}
          small
          style={{ justifyContent: 'flex-end', marginTop: 8 }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            marginTop: 'auto',
            fontSize: 15,
            lineHeight: 1.5,
            color: palette.soft,
          }}
        >
          {data.availability ? <span>{data.availability.text}</span> : null}
          <span>{[data.country, data.time].filter(Boolean).join(' · ')}</span>
        </div>
      </div>
      <Brand
        color="#fff"
        size={12}
        style={{ position: 'absolute', right: 36, bottom: 12 }}
      />
    </div>
  );
};

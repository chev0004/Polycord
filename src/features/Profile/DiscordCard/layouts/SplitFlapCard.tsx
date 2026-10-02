import { useTranslations } from 'next-intl';
import { BrandName, CardAvatar, TagChips } from '../CardParts';
import type { DiscordCardLayoutProps } from '../types';
import '../splitFlap.css';

const MAX_WORD_LENGTH = 18;
const SMALL_WORD_LENGTH = 9;
const MEDIUM_WORD_LENGTH = 15;

const clip = (word: string) =>
  word.length > MAX_WORD_LENGTH
    ? `${word.slice(0, MAX_WORD_LENGTH - 1)}…`
    : word;

const flapSize = (width: number) => {
  if (width > MEDIUM_WORD_LENGTH) return 'dc-tn';
  return width > SMALL_WORD_LENGTH ? 'dc-sm' : '';
};

const Flaps = ({
  word,
  width,
  className = '',
}: {
  word: string;
  width: number;
  className?: string;
}) => {
  const letters = [...word.toLocaleUpperCase().padEnd(width, ' ')];

  return (
    <div className={`dc-sf-c ${className}`}>
      {letters.map((letter, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: flap cells are positional
        <span key={index}>{letter}</span>
      ))}
    </div>
  );
};

const Clock = ({ time }: { time: string }) => (
  <div className="dc-sf-c dc-xs">
    {[...time].map((char, index) =>
      char === ':' ? (
        // biome-ignore lint/suspicious/noArrayIndexKey: clock cells are positional
        <i key={index}>{char}</i>
      ) : (
        // biome-ignore lint/suspicious/noArrayIndexKey: clock cells are positional
        <span key={index}>{char}</span>
      ),
    )}
  </div>
);

export const SplitFlapCard = ({ data, active }: DiscordCardLayoutProps) => {
  const t = useTranslations('DiscordCard');
  const target = data.targets[active];
  const names = data.targets.map((item) => clip(item.name));
  const levels = data.targets.map((item) => item.level);
  const nameWidth = Math.max(1, ...names.map((name) => name.length));
  const levelWidth = Math.max(1, ...levels.map((level) => level.length));

  return (
    <div className="dc-sf">
      <div className="dc-sf-b">
        <div className="dc-sf-r">
          <span className="dc-k">{t('speaks')}</span>
          <Flaps
            word={clip(data.native.name)}
            width={clip(data.native.name).length}
            className={`dc-pri ${flapSize(clip(data.native.name).length)}`}
          />
        </div>
        {target ? (
          <>
            <div className="dc-sf-r">
              <span className="dc-k">{t('learning')}</span>
              <Flaps
                word={clip(target.name)}
                width={nameWidth}
                className={flapSize(nameWidth)}
              />
            </div>
            <div className="dc-sf-r">
              <span className="dc-k">{t('level')}</span>
              <Flaps word={target.level} width={levelWidth} className="dc-sm" />
            </div>
          </>
        ) : null}
        {data.tags.length ? (
          <div className="dc-sf-r" style={{ marginTop: 4 }}>
            <span className="dc-k">{t('interests')}</span>
            <TagChips tags={data.tags} small />
          </div>
        ) : null}
      </div>
      <div className="dc-sf-p">
        <div className="dc-sf-id">
          <CardAvatar data={data} />
          <div className="dc-sf-who">
            <div className="dc-sf-nm">{data.name}</div>
            <div className="dc-sf-un">{data.handle}</div>
          </div>
        </div>
        <div style={{ marginTop: 'auto' }} />
        {data.availability ? (
          <div className="dc-sf-i">
            <span className="dc-k">{t('freeTime')}</span>
            <span className="dc-sf-v">
              <b style={{ fontWeight: 700 }}>{data.availability.days}</b>{' '}
              {data.availability.range}
            </span>
          </div>
        ) : null}
        <div className="dc-sf-i">
          <span className="dc-k">
            {data.time
              ? t('localTimeIn', { country: data.country })
              : data.country}
          </span>
          {data.time ? <Clock time={data.time} /> : null}
        </div>
        <BrandName style={{ fontSize: 13 }} />
      </div>
    </div>
  );
};

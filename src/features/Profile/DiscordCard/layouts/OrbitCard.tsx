import { useTranslations } from 'next-intl';
import { BrandName, CardAvatar, Cycle, FitText, TagChips } from '../CardParts';
import type { DiscordCardLayoutProps } from '../types';
import '../orbit.css';

const CENTER_X = 744;
const CENTER_Y = 160;
const RADIUS = 150;
const RINGS = [200, 300, 420];

export const OrbitCard = ({ data, active }: DiscordCardLayoutProps) => {
  const t = useTranslations('DiscordCard');
  const target = data.targets[active];
  const count = data.targets.length;

  return (
    <div className="dc-ob">
      {RINGS.map((size) => (
        <div
          key={size}
          className="dc-ob-rg"
          style={{ width: size, height: size }}
        />
      ))}
      <CardAvatar data={data} />
      <span
        className="dc-ob-c dc-nat"
        style={{ left: CENTER_X, top: CENTER_Y - 100 }}
      >
        {data.native.code}
      </span>
      {data.targets.map((item, index) => {
        const angle =
          ((180 + ((index - active) * 360) / count) * Math.PI) / 180;

        return (
          <span
            key={item.code}
            className="dc-ob-c"
            style={{
              left: CENTER_X + RADIUS * Math.cos(angle),
              top: CENTER_Y + RADIUS * Math.sin(angle),
            }}
          >
            {item.code}
          </span>
        );
      })}
      <BrandName
        style={{ position: 'absolute', left: 40, bottom: 14, fontSize: 11 }}
      />
      <div>
        <div className="dc-ob-nm">{data.name}</div>
        <div className="dc-ob-un">
          {data.handle}
          {data.availability ? ` · ${data.availability.text}` : null}
          {data.country ? ` · ${data.country}` : null}
          {data.time ? ` · ${data.time}` : null}
        </div>
        <TagChips tags={data.tags} small style={{ marginTop: 12 }} />
      </div>
      <div className="dc-ob-ls">
        <div className="dc-ob-r">
          <span className="dc-k">{t('native')}</span>
          <FitText className="dc-ob-ja" max={380}>
            {data.native.script}
          </FitText>
        </div>
        {target ? (
          <div className="dc-ob-r">
            <span className="dc-k">{t('learning')}</span>
            <Cycle>
              <span key={active}>
                <FitText className="dc-ob-en" max={300}>
                  {target.name}
                </FitText>
                <span className="dc-ob-lv">{target.level}</span>
              </span>
            </Cycle>
          </div>
        ) : null}
      </div>
    </div>
  );
};

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { BrandName, CardAvatar, Cycle, FitText, TagChips } from '../CardParts';
import type { DiscordCardLayoutProps } from '../types';
import '../orbit.css';

const CENTER_X = 744;
const CENTER_Y = 160;
const RADIUS = 150;
const RINGS = [200, 300, 420];
const SPIN_DURATION = 1000;

const easeInOutCubic = (progress: number) =>
  progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;

const homeAngle = (active: number, count: number) =>
  count ? (-360 * active) / count : 0;

const useOrbitAngle = (active: number, count: number) => {
  const [angle, setAngle] = useState(() => homeAngle(active, count));
  const spin = useRef({
    active,
    count,
    shown: angle,
    goal: angle,
  });

  useEffect(() => {
    const state = spin.current;
    if (state.count !== count) {
      const home = homeAngle(active, count);
      Object.assign(state, { active, count, shown: home, goal: home });
      setAngle(home);
      return;
    }
    if (count < 1 || state.active === active) return;
    state.goal -= (360 / count) * ((active - state.active + count) % count);
    state.active = active;
    const from = state.shown;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / SPIN_DURATION);
      state.shown = from + (state.goal - from) * easeInOutCubic(progress);
      setAngle(state.shown);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, count]);

  return angle;
};

export const OrbitCard = ({ data, active }: DiscordCardLayoutProps) => {
  const t = useTranslations('DiscordCard');
  const target = data.targets[active];
  const count = data.targets.length;
  const angle = useOrbitAngle(active, count);

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
        const radians = ((180 + (index * 360) / count + angle) * Math.PI) / 180;

        return (
          <span
            key={item.code}
            className="dc-ob-c"
            style={{
              left: CENTER_X + RADIUS * Math.cos(radians),
              top: CENTER_Y + RADIUS * Math.sin(radians),
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
            <Cycle targets={data.targets} active={active}>
              {(target) => (
                <>
                  <FitText className="dc-ob-en" max={300}>
                    {target.name}
                  </FitText>
                  <span className="dc-ob-lv">{target.level}</span>
                </>
              )}
            </Cycle>
          </div>
        ) : null}
      </div>
    </div>
  );
};

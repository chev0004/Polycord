import type { ReactElement } from 'react';
import { DISCORD_CARD_CYCLE, type DiscordCardData } from '../types';
import type { Measure } from './measure';
import type { CardPalette } from './palette';
import { addLayer, clamp, difference, type Pixels } from './pixels';

const FADE = 500;
const SLIDE = 600;
const SETTLED = 1800;

export type Shot = {
  active?: number;
  lit?: number;
  data?: DiscordCardData;
  show?: string[];
  lite?: boolean;
};

export type Stage = {
  data: DiscordCardData;
  palette: CardPalette;
  measure: Measure;
  t: (key: string) => string;
  count: number;
  shot: (shot?: Shot) => Promise<Pixels>;
  sheet: (
    element: ReactElement,
    width: number,
    height: number,
  ) => Promise<Pixels>;
};

export type Beat = {
  time: number;
  active: number;
  previous: number;
  elapsed: number;
};

export type Paint = (beat: Beat) => Pixels;

export type Motion = (stage: Stage) => Promise<{
  continuous?: number;
  paint: Paint;
}>;

export const bezier = (x1: number, y1: number, x2: number, y2: number) => {
  const curve = (a: number, b: number, at: number) =>
    3 * (1 - at) ** 2 * at * a + 3 * (1 - at) * at ** 2 * b + at ** 3;
  return (progress: number) => {
    if (progress <= 0) return 0;
    if (progress >= 1) return 1;
    let low = 0;
    let high = 1;
    for (let step = 0; step < 20; step++) {
      const middle = (low + high) / 2;
      if (curve(x1, x2, middle) < progress) low = middle;
      else high = middle;
    }
    return curve(y1, y2, low);
  };
};

export const ease = bezier(0.25, 0.1, 0.25, 1);
const rise = bezier(0.2, 0.8, 0.2, 1);

export const beatAt = (time: number, count: number): Beat => {
  const position = time + SETTLED;
  const step = Math.floor(position / DISCORD_CARD_CYCLE);
  return {
    time,
    active: step % count,
    previous: (step + count - 1) % count,
    elapsed: count > 1 ? position % DISCORD_CARD_CYCLE : DISCORD_CARD_CYCLE,
  };
};

export const states = (count: number) => [...Array(count).keys()];

export const resting = (paint: Paint): Paint => {
  const stills = new Map<number, Pixels>();
  return (beat) => {
    if (beat.elapsed < SETTLED) return paint(beat);
    const still = stills.get(beat.active) ?? paint(beat);
    stills.set(beat.active, still);
    return still;
  };
};

export const layer = async (
  stage: Stage,
  motion: string,
  shot: Shot = {},
  ground: Shot = shot,
) =>
  difference(
    await stage.shot({ ...shot, show: [motion], lite: true }),
    await stage.shot({ ...ground, lite: true }),
  );

export const slides = async (
  stage: Stage,
  em: number,
  {
    name = 'cycle',
    data,
    varies = false,
  }: { name?: string; data?: DiscordCardData; varies?: boolean } = {},
) => {
  const layers = await Promise.all(
    states(stage.count).map((active) =>
      layer(
        stage,
        name,
        { data, active },
        { data, active: varies ? active : 0 },
      ),
    ),
  );
  const from = (stage.count === 2 ? -0.4 : 0.4) * em;

  return (frame: Pixels, { active, previous, elapsed }: Beat) => {
    const fade = ease(elapsed / FADE);
    const slide = rise(clamp(elapsed / SLIDE));
    addLayer(frame, layers[active], fade, from * (1 - slide));
    if (previous !== active)
      addLayer(frame, layers[previous], 1 - fade, -0.4 * em * slide);
  };
};

export const shifts = async (stage: Stage) => {
  const ground = await stage.shot({ lite: true });
  return Promise.all(
    states(stage.count).map(async (active) =>
      difference(await stage.shot({ active, lite: true }), ground),
    ),
  );
};

export const cycling =
  (em: number, { varies = false } = {}): Motion =>
  async (stage) => {
    const base = await stage.shot();
    const slide = await slides(stage, em, { varies });
    const moved = varies ? await shifts(stage) : undefined;

    return {
      paint: (beat) => {
        const frame = base.slice();
        if (moved) addLayer(frame, moved[beat.active]);
        slide(frame, beat);
        return frame;
      },
    };
  };

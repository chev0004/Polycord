import { describe, expect, it } from 'bun:test';
import { discordCardVars } from './theme';

const vars = (banner: string, accent: string) =>
  discordCardVars(banner, accent) as Record<string, string>;

describe('discordCardVars', () => {
  it('uses the fixed palette for the sky banner', () => {
    expect(vars('#c1d5e9', '#7a8a99')).toMatchObject({
      '--color-primary': '#c1d5e9',
      '--cf': '#c1d5e9',
      '--ci': '#111',
    });
  });

  it('uses dark ink on light flat banners', () => {
    expect(vars('#f9a8cf', '#7a8a99')).toMatchObject({
      '--color-primary': '#f9a8cf',
      '--cf': '#f9a8cf',
      '--ci': '#111',
    });
  });

  it('uses light ink and a lifted primary on dark flat banners', () => {
    const result = vars('#222222', '#7a8a99');

    expect(result['--ci']).toBe('#fff');
    expect(result['--color-primary']).not.toBe('#222222');
  });

  it('derives gradient banners from the accent', () => {
    const banner = 'linear-gradient(115deg, #3a45ef, #5964f2 55%, #7883f5)';
    const result = vars(banner, '#5964f2');

    expect(result['--cf']).toBe(banner);
    expect(result['--color-primary']).toBe('#5964f2');
    expect(result['--ci']).toBe('#fff');
  });
});

import { describe, expect, it } from 'bun:test';
import { findCardTheme, getCustomCardTheme } from './cardTheme';

describe('card theme accents', () => {
  it('gives premium-capable accents to the free card colours', () => {
    expect(findCardTheme('sky')?.accent).toBe('#8fb3d9');
    expect(findCardTheme('pink')?.accent).toBe('#ec8fbd');
    expect(findCardTheme('slate')?.accent).toBe('#8395a8');
  });

  it('keeps custom gradient accents as the blend of their colours', () => {
    expect(getCustomCardTheme({ from: '#ff5f6d', to: '#ffc371' }).accent).toBe(
      '#ff8c6f',
    );
  });

  it('lightens dark custom gradient accents so they stay readable', () => {
    expect(getCustomCardTheme({ from: '#112233', to: '#445566' }).accent).toBe(
      '#5b6875',
    );
  });
});

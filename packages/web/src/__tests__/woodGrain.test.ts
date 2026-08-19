import { describe, it, expect } from 'vitest';
import { isWoodTheme, shiftHex, woodGrainFor } from '../woodGrain.js';

describe('wood grain', () => {
  it('is deterministic per square and different across the board', () => {
    expect(woodGrainFor('a1')).toEqual(woodGrainFor('a1'));
    expect(woodGrainFor('a1')).not.toEqual(woodGrainFor('e4'));
    expect(woodGrainFor('h8').streaks.length).toBeGreaterThan(3);
  });

  it('applies to the wood themes only', () => {
    expect(isWoodTheme('walnut')).toBe(true);
    expect(isWoodTheme('maple')).toBe(true);
    expect(isWoodTheme('rosewood')).toBe(true);
    expect(isWoodTheme('brown')).toBe(true);
    expect(isWoodTheme('mat')).toBe(false);
    expect(isWoodTheme('blue')).toBe(false);
  });

  it('shiftHex moves a color toward black or white', () => {
    expect(shiftHex('#808080', 0.5)).toBe('#404040');
    expect(shiftHex('#808080', -1)).toBe('#ffffff');
  });
});

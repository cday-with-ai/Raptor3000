import { describe, it, expect } from 'vitest';
import { BOARD_THEME_LABEL_INK, inSquareInk } from '../boardLabels.js';
import { BOARD_THEMES } from '../preferences.js';

/**
 * The contract worth pinning is not the colours — it is that the derived
 * rule survives. An override table is the kind of thing that grows until
 * someone "completes" it for every theme, at which point `custom` (whose
 * two colours are user-chosen and in no table) silently loses its labels.
 */
describe('in-square label ink', () => {
  it('falls back to the opposite square for a theme with no override', () => {
    // brown: #f0d9b5 light, #b58863 dark — no entry, so derived both ways.
    expect(inSquareInk('brown', false, '#f0d9b5', '#b58863')).toBe('#b58863');
    expect(inSquareInk('brown', true, '#f0d9b5', '#b58863')).toBe('#f0d9b5');
  });

  it('uses the override where a theme declares one', () => {
    expect(inSquareInk('ic', false, '#ececec', '#c1c18e')).toBe('#8a8a5e');
    expect(inSquareInk('ic', true, '#ececec', '#c1c18e')).toBe('#f4f4f4');
  });

  it('never overrides custom — its colours exist only in the preferences', () => {
    expect(BOARD_THEME_LABEL_INK.custom).toBeUndefined();
    expect(inSquareInk('custom', false, '#112233', '#445566')).toBe('#445566');
    expect(inSquareInk('custom', true, '#112233', '#445566')).toBe('#112233');
  });

  it('only overrides themes that need it — most stay derived', () => {
    const overridden = BOARD_THEMES.filter(t => BOARD_THEME_LABEL_INK[t]);
    // If this ever approaches the full roster, the derived rule has been
    // quietly replaced by a table and custom is the thing that breaks.
    expect(overridden.length).toBeLessThan(BOARD_THEMES.length / 2);
  });
});

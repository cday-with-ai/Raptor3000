import { describe, it, expect, beforeEach } from 'vitest';
import {
  BOARD_THEMES,
  DEFAULT_PREFERENCES,
  PIECE_SETS,
  boardColors,
  loadPreferences,
  savePreferences,
} from '../preferences.js';

/**
 * Board look preferences — the Chess Ascent port (2026-08-12).
 *
 * The theme roster, the color table, the custom escape hatch and the piece
 * sets are chessascent.app's, verbatim. What these tests pin:
 *   - the color table matches Chess Ascent's SettingsStore to the hex,
 *     because "a board here looks exactly like a board there" is the spec;
 *   - stored values from the pre-port roster ('slate', 'classic') fall
 *     back to the new defaults rather than crashing or half-applying;
 *   - a corrupt custom color can't reach the board style attribute.
 */

// The suite runs in a plain node environment (see vite.config.ts) — give
// the module the one browser global it touches. Same shape the real one
// has, minus the parts preferences.ts never calls.
const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
};

beforeEach(() => {
  store.clear();
});

describe('defaults', () => {
  it('is brown + cburnett, like Chess Ascent', () => {
    const p = loadPreferences();
    expect(p.boardTheme).toBe('brown');
    expect(p.pieceSet).toBe('cburnett');
  });

  it('round-trips through save/load', () => {
    savePreferences({
      ...DEFAULT_PREFERENCES,
      boardTheme: 'horsey',
      pieceSet: 'leipzig',
      customLightSquareColor: '#abcdef',
      customDarkSquareColor: '#123456',
    });
    const p = loadPreferences();
    expect(p.boardTheme).toBe('horsey');
    expect(p.pieceSet).toBe('leipzig');
    expect(p.customLightSquareColor).toBe('#abcdef');
    expect(p.customDarkSquareColor).toBe('#123456');
  });
});

describe('migration from the pre-port roster', () => {
  it("falls back to defaults for 'slate' theme and 'classic' pieces", () => {
    localStorage.setItem('pref.boardTheme', 'slate');
    localStorage.setItem('pref.pieceSet', 'classic');
    const p = loadPreferences();
    expect(p.boardTheme).toBe('brown');
    expect(p.pieceSet).toBe('cburnett');
  });

  it("keeps 'blue', which exists in both rosters", () => {
    localStorage.setItem('pref.boardTheme', 'blue');
    expect(loadPreferences().boardTheme).toBe('blue');
  });
});

describe('custom colors', () => {
  it('rejects a non-hex stored value', () => {
    localStorage.setItem('pref.customLightSquareColor', 'javascript:alert(1)');
    localStorage.setItem('pref.customDarkSquareColor', 'red');
    const p = loadPreferences();
    expect(p.customLightSquareColor).toBe(DEFAULT_PREFERENCES.customLightSquareColor);
    expect(p.customDarkSquareColor).toBe(DEFAULT_PREFERENCES.customDarkSquareColor);
  });

  it('accepts 3- and 6-digit hex', () => {
    localStorage.setItem('pref.customLightSquareColor', '#fff');
    localStorage.setItem('pref.customDarkSquareColor', '#B58863');
    const p = loadPreferences();
    expect(p.customLightSquareColor).toBe('#fff');
    expect(p.customDarkSquareColor).toBe('#B58863');
  });

  it('is what boardColors returns when the theme is custom', () => {
    const colors = boardColors({
      ...DEFAULT_PREFERENCES,
      boardTheme: 'custom',
      customLightSquareColor: '#111111',
      customDarkSquareColor: '#222222',
    });
    expect(colors).toEqual({ light: '#111111', dark: '#222222' });
  });
});

describe('the color table is Chess Ascent, to the hex', () => {
  const expected = {
    brown: { light: '#f0d9b5', dark: '#b58863' },
    blue: { light: '#dee3e6', dark: '#8ca2ad' },
    green: { light: '#ffffdd', dark: '#86a666' },
    purple: { light: '#e8dff5', dark: '#9b7ebd' },
    ic: { light: '#ececec', dark: '#c1c18e' },
    horsey: { light: '#f0d9b5', dark: '#946f51' },
  } as const;

  for (const [theme, colors] of Object.entries(expected)) {
    it(theme, () => {
      expect(
        boardColors({ ...DEFAULT_PREFERENCES, boardTheme: theme as keyof typeof expected }),
      ).toEqual(colors);
    });
  }

  it('every non-custom roster entry is in the table (and vice versa)', () => {
    expect(BOARD_THEMES.filter(t => t !== 'custom').sort()).toEqual(
      Object.keys(expected).sort(),
    );
  });

  it('every piece set has its SVG directory copied into public/', () => {
    // The sets are data, the files are assets; a typo in either direction
    // renders every piece as a broken image with no test failing anywhere.
    for (const set of PIECE_SETS) {
      for (const piece of ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP']) {
        expect(
          fileExists(new URL(`../../public/pieces/${set}/${piece}.svg`, import.meta.url)),
          `${set}/${piece}.svg`,
        ).toBe(true);
      }
    }
  });
});

function fileExists(url: URL): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('node:fs').existsSync(url);
  } catch {
    return false;
  }
}

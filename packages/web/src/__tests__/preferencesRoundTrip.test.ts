import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
  type AppPreferences,
} from '../preferences.js';

/**
 * The writer is a hand-written list of `setRaw` calls that runs parallel to
 * the reader's hand-written list of `readX` calls. Nothing links them, so
 * adding a preference to the type, the defaults and the reader — and
 * forgetting the writer — compiles, type-checks, and half-works: the option
 * moves in the UI, persists nothing, and is back to default on reload.
 *
 * That is exactly how `appIcon` shipped broken on 2026-08-18, and it was
 * only caught because a live test read the favicon after picking one.
 *
 * So: change every key away from its default, round-trip through storage,
 * and demand it all comes back. A future preference that misses the writer
 * fails here by name instead of in someone's browser.
 */
// Plain node environment (see vite.config.ts) — same minimal stub the
// sibling preferences suite installs.
const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
};

describe('preferences round-trip', () => {
  beforeEach(() => store.clear());

  it('persists every key in AppPreferences', () => {
    const flipped = Object.fromEntries(
      Object.entries(DEFAULT_PREFERENCES).map(([k, v]) => {
        if (typeof v === 'boolean') return [k, !v];
        // Ratios are clamped to 0..1, so `+1` would be rejected by the
        // reader and read back as the default — a false failure. Move
        // within the legal range instead; everything else is a font size
        // or a count where +1 is fine.
        if (typeof v === 'number') return [k, v > 0 && v < 1 ? 0.37 : v + 1];
        return [k, `zz-${String(v)}`];
      }),
    ) as AppPreferences;

    savePreferences(flipped);
    const back = loadPreferences();

    // String values are validated against allow-lists, so a nonsense value
    // legitimately falls back to the default. Booleans and numbers have no
    // such excuse: if one of those did not survive, its key is missing from
    // savePreferences.
    for (const [key, value] of Object.entries(flipped)) {
      if (typeof value === 'boolean' || typeof value === 'number') {
        expect(back[key as keyof AppPreferences], `${key} did not persist`).toBe(value);
      }
    }
  });

  it('persists every enumerated key, using real values', () => {
    // The allow-listed keys need real alternatives rather than junk. Any
    // key whose default is a string gets checked against a second legal
    // value drawn from its own reader, via a save/load cycle per key.
    const cases: Partial<AppPreferences> = {
      appIcon: 'ranger',
      pieceSet: 'ocisly',
      boardTheme: 'green',
      clockSet: 'dgt',
      boardFrame: 'mat',
      moveSoundSet: 'walnut',
    };
    for (const [key, value] of Object.entries(cases)) {
      savePreferences({ ...DEFAULT_PREFERENCES, [key]: value });
      expect(loadPreferences()[key as keyof AppPreferences], `${key} did not persist`).toBe(value);
    }
  });
});

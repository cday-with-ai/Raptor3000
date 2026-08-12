import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Per-mode board layout memory (Carson, 2026-08-12): "When playing
 * remember the last state of the expanders and % bars and restore it
 * that way, same with observing and examining."
 *
 * What these tests pin:
 *   - each bucket (playing/observing/examining) is its own memory —
 *     resizing while observing must not reshape the playing window;
 *   - an untouched bucket falls back to the global prefs, so nothing
 *     changed for existing setups the day this shipped;
 *   - playing's move list still starts collapsed by default, but the
 *     remembered value wins once the user has toggled it;
 *   - garbage in localStorage (out-of-bounds ratio, non-boolean) falls
 *     back instead of half-applying.
 */

// Node test env: the module touches localStorage and window.dispatchEvent.
const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
};
const dispatched: string[] = [];
(globalThis as { window?: unknown }).window = {
  dispatchEvent: (e: { type: string }) => {
    dispatched.push(e.type);
    return true;
  },
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
};
(globalThis as { Event?: unknown }).Event ??= class {
  type: string;
  constructor(type: string) {
    this.type = type;
  }
};

const { loadBoardLayout, saveBoardLayoutField } = await import(
  '../useLivePreferences.js'
);
const { savePreferences, DEFAULT_PREFERENCES } = await import(
  '../preferences.js'
);

beforeEach(() => {
  store.clear();
  dispatched.length = 0;
});

describe('fallback to global prefs', () => {
  it('an untouched bucket mirrors the global layout prefs', () => {
    savePreferences({
      ...DEFAULT_PREFERENCES,
      boardPanelRatio: 0.42,
      boardPanelOpen: false,
      engineSplitRatio: 0.5,
    });
    const l = loadBoardLayout('observing');
    expect(l.panelRatio).toBe(0.42);
    expect(l.panelOpen).toBe(false);
    expect(l.toolbarOpen).toBe(true);
    expect(l.engineRatio).toBe(0.5);
  });

  it('playing starts its move list collapsed; the others follow the pref', () => {
    expect(loadBoardLayout('playing').movesExpanded).toBe(false);
    expect(loadBoardLayout('observing').movesExpanded).toBe(
      DEFAULT_PREFERENCES.moveListVisible,
    );
  });
});

describe('per-bucket isolation', () => {
  it('a write to one bucket leaves the others on their fallbacks', () => {
    saveBoardLayoutField('playing', 'panelRatio', 0.15);
    saveBoardLayoutField('playing', 'panelOpen', false);
    expect(loadBoardLayout('playing').panelRatio).toBe(0.15);
    expect(loadBoardLayout('playing').panelOpen).toBe(false);
    expect(loadBoardLayout('observing').panelRatio).toBe(
      DEFAULT_PREFERENCES.boardPanelRatio,
    );
    expect(loadBoardLayout('observing').panelOpen).toBe(true);
    expect(loadBoardLayout('examining').panelOpen).toBe(true);
  });

  it('a remembered movesExpanded beats the playing-collapsed default', () => {
    saveBoardLayoutField('playing', 'movesExpanded', true);
    expect(loadBoardLayout('playing').movesExpanded).toBe(true);
  });

  it('echoes locally so the writing window re-renders', () => {
    saveBoardLayoutField('examining', 'engineRatio', 0.3);
    expect(dispatched).toContain('raptor:prefs-changed');
  });
});

describe('corrupt storage', () => {
  it('out-of-bounds ratios and non-boolean flags fall back', () => {
    localStorage.setItem('pref.layout.playing.panelRatio', '0.95'); // > 0.5
    localStorage.setItem('pref.layout.playing.engineRatio', 'NaN');
    localStorage.setItem('pref.layout.playing.panelOpen', 'maybe');
    const l = loadBoardLayout('playing');
    expect(l.panelRatio).toBe(DEFAULT_PREFERENCES.boardPanelRatio);
    expect(l.engineRatio).toBe(DEFAULT_PREFERENCES.engineSplitRatio);
    expect(l.panelOpen).toBe(true);
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  WindowManager,
  getWindowManager,
  type OpenWindowSpec,
} from '../WindowManager.js';

/**
 * WindowManager is the last React-free piece of `packages/web` that had no
 * tests, and it sits directly under the open question "why doesn't the board
 * appear" — everything from GameService down is covered, so what remains is
 * the URL, the window name, the feature string and the position maths, none
 * of which anything checked.
 *
 * It needs no jsdom. What it actually touches is `window.open`, `window.screen`,
 * `location.pathname`, `localStorage` and two `setInterval` polls, so this file
 * installs fakes for those on `globalThis` and drives the timers with vitest's.
 * The assertions are on the three strings handed to `window.open` and on what
 * lands in localStorage — i.e. exactly the values a browser acts on.
 *
 * What this cannot see: whether a browser honours `popup`, whether the
 * coordinates land on a monitor that exists, and whether a real popup is
 * blocked. Those need a browser.
 */

const STORAGE_KEY = 'raptor3000.windowPositions.v1';

// ---- fakes -----------------------------------------------------------------

class FakeStorage {
  private data = new Map<string, string>();
  /** When set, setItem throws — the quota / storage-disabled case. */
  failWrites = false;

  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error('QuotaExceededError');
    this.data.set(key, String(value));
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  clear(): void {
    this.data.clear();
  }
  /** Test-side helpers, not part of the Storage interface. */
  seedPositions(map: Record<string, unknown>): void {
    this.data.set(STORAGE_KEY, JSON.stringify(map));
  }
  seedRaw(raw: string): void {
    this.data.set(STORAGE_KEY, raw);
  }
  positions(): Record<string, { x: number; y: number; width: number; height: number }> {
    const raw = this.data.get(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  }
}

/** Mimics the bits of `Location` WindowManager reads/writes: href and
 *  search, kept in sync the way a browser keeps them. */
class FakeLocation {
  private _href = '/app/?window=board&id=0';
  get href(): string {
    return this._href;
  }
  set href(v: string) {
    this._href = v;
    const q = v.indexOf('?');
    this.search = q === -1 ? '' : v.slice(q);
  }
  search = '';
}

/** The subset of Window a popup handle needs for persistence + close-watching. */
class FakePopup {
  closed = false;
  focusCount = 0;
  closeCount = 0;
  screenX = 0;
  screenY = 0;
  outerWidth = 0;
  outerHeight = 0;
  /** The popup's own URL; WindowManager navigates slot windows through it. */
  location = new FakeLocation();

  focus(): void {
    this.focusCount++;
  }
  close(): void {
    this.closeCount++;
    this.closed = true;
  }
}

interface OpenCall {
  url: string;
  name: string;
  features: string;
}

interface FakeScreen {
  availLeft?: number;
  availTop?: number;
  availWidth?: number;
  availHeight?: number;
  width: number;
  height: number;
}

let storage: FakeStorage;
let openCalls: OpenCall[];
/** Popups `window.open` will return, in order. `null` models a blocked popup. */
let openResults: (FakePopup | null)[];

function installGlobals(screen: Partial<FakeScreen> = {}): void {
  storage = new FakeStorage();
  openCalls = [];
  openResults = [];

  const fakeScreen: FakeScreen = {
    availLeft: 0,
    availTop: 0,
    availWidth: 1000,
    availHeight: 800,
    width: 1000,
    height: 800,
    ...screen,
  };
  // `?? 0` / `?? s.width` branches only show up when the key is absent, not
  // when it is undefined-valued, so strip explicit undefineds.
  for (const k of Object.keys(fakeScreen) as (keyof FakeScreen)[]) {
    if (fakeScreen[k] === undefined) delete fakeScreen[k];
  }

  const fakeWindow = {
    screen: fakeScreen,
    open(url: string, name: string, features: string): FakePopup | null {
      openCalls.push({ url, name, features });
      const next = openResults.shift();
      const popup = next === undefined ? new FakePopup() : next;
      // What a real browser does: the popup loads the url it was opened at.
      if (popup) popup.location.href = url;
      return popup;
    },
  };

  Object.assign(globalThis, {
    window: fakeWindow,
    localStorage: storage,
    location: { pathname: '/app/' },
  });
}

function uninstallGlobals(): void {
  for (const k of ['window', 'localStorage', 'location']) {
    delete (globalThis as Record<string, unknown>)[k];
  }
}

/**
 * `window.open`'s third argument is a comma-separated list of `key=value`
 * pairs plus valueless flags like `popup`. Parse it back so assertions read
 * as intent rather than as substring matching.
 */
function parseFeatures(features: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const part of features.split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) out.set(part.trim(), '');
    else out.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
  }
  return out;
}

function geometryOf(call: OpenCall): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  const f = parseFeatures(call.features);
  return {
    left: Number(f.get('left')),
    top: Number(f.get('top')),
    width: Number(f.get('width')),
    height: Number(f.get('height')),
  };
}

/** Queue the popup handle the next `window.open` will hand back. */
function nextPopup(popup: FakePopup | null): void {
  openResults.push(popup);
}

const board = (id: string): OpenWindowSpec => ({ kind: 'board', id });

/** A slot window: stable name, changes the game it shows. */
const followSlot = (id: string): OpenWindowSpec => ({
  kind: 'board',
  id,
  slot: 'follow',
});

beforeEach(() => {
  installGlobals();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  uninstallGlobals();
});

// ---- the URL a popup is opened at ------------------------------------------

describe('WindowManager — the URL', () => {
  it('names the window kind in the query string', () => {
    new WindowManager().open({ kind: 'chat' });
    expect(openCalls[0].url).toBe('/app/?window=chat');
  });

  it('passes a board id as `id`, which is the param App.tsx reads', () => {
    // App.tsx:26 does params.get('id') and hands it to BoardWindow as gameId.
    // The header comment in WindowManager once said `game=42`; it never was.
    new WindowManager().open(board('42'));
    const params = new URLSearchParams(openCalls[0].url.split('?')[1]);
    expect(params.get('window')).toBe('board');
    expect(params.get('id')).toBe('42');
  });

  it('keeps the current pathname rather than assuming the app is at root', () => {
    // A popup opened at '/' would boot the main window instead of a board
    // whenever the app is served under a subpath.
    new WindowManager().open(board('7'));
    expect(openCalls[0].url.startsWith('/app/?')).toBe(true);
  });
});

// ---- window identity: one window per key -----------------------------------

describe('WindowManager — window identity', () => {
  it('keys multi-instance windows on kind:id and singletons on kind alone', () => {
    const wm = new WindowManager();
    wm.open({ kind: 'chat' });
    wm.open(board('42'));
    expect(openCalls.map((c) => c.name)).toEqual(['chat', 'board:42']);
  });

  it('focuses an already-open window instead of opening a second one', () => {
    const wm = new WindowManager();
    const popup = new FakePopup();
    nextPopup(popup);

    expect(wm.open(board('42'))).toBe(popup);
    expect(wm.open(board('42'))).toBe(popup);

    expect(openCalls).toHaveLength(1);
    expect(popup.focusCount).toBe(1);
  });

  it('opens a fresh window for a different game', () => {
    const wm = new WindowManager();
    wm.open(board('42'));
    wm.open(board('43'));
    expect(openCalls.map((c) => c.name)).toEqual(['board:42', 'board:43']);
  });

  it('reopens rather than focuses once the user has closed the popup', () => {
    const wm = new WindowManager();
    const popup = new FakePopup();
    nextPopup(popup);
    wm.open(board('42'));

    popup.closed = true;
    wm.open(board('42'));

    expect(openCalls).toHaveLength(2);
    expect(popup.focusCount).toBe(0);
  });

  it('reports isOpen from the live handle, not from bookkeeping', () => {
    const wm = new WindowManager();
    const popup = new FakePopup();
    nextPopup(popup);
    wm.open(board('42'));

    expect(wm.isOpen(board('42'))).toBe(true);
    expect(wm.isOpen(board('43'))).toBe(false);

    // Closed by the user; nothing has told the manager yet.
    popup.closed = true;
    expect(wm.isOpen(board('42'))).toBe(false);
  });

  it('closes one window and forgets it', () => {
    const wm = new WindowManager();
    const popup = new FakePopup();
    nextPopup(popup);
    wm.open(board('42'));

    wm.close(board('42'));
    expect(popup.closeCount).toBe(1);
    expect(wm.isOpen(board('42'))).toBe(false);
  });

  it('closeAll closes every tracked window', () => {
    const wm = new WindowManager();
    const a = new FakePopup();
    const b = new FakePopup();
    nextPopup(a);
    nextPopup(b);
    wm.open(board('42'));
    wm.open({ kind: 'chat' });

    wm.closeAll();
    expect(a.closeCount).toBe(1);
    expect(b.closeCount).toBe(1);
    expect(wm.isOpen(board('42'))).toBe(false);
    expect(wm.isOpen({ kind: 'chat' })).toBe(false);
  });
});

// ---- slot windows ----------------------------------------------------------

describe('WindowManager — slot windows', () => {
  it('names the window by slot and carries the game id in the URL', () => {
    new WindowManager().open(followSlot('42'));
    expect(openCalls[0].name).toBe('board:follow');
    const params = new URLSearchParams(openCalls[0].url.split('?')[1]);
    expect(params.get('window')).toBe('board');
    expect(params.get('id')).toBe('42');
    expect(params.get('slot')).toBe('follow');
  });

  it('retargets the same slot window to a new game instead of opening another', () => {
    const wm = new WindowManager();
    const popup = new FakePopup();
    nextPopup(popup);
    wm.open(followSlot('42'));

    wm.open(followSlot('77'));

    expect(openCalls).toHaveLength(1);
    expect(popup.location.href).toBe('/app/?window=board&id=77&slot=follow');
    expect(popup.focusCount).toBe(1);
  });

  it('leaves the slot window alone when the game has not changed', () => {
    const wm = new WindowManager();
    const popup = new FakePopup();
    nextPopup(popup);
    wm.open(followSlot('42'));

    const before = popup.location.href;
    wm.open(followSlot('42'));

    expect(popup.location.href).toBe(before);
    expect(popup.focusCount).toBe(1);
  });

  it('persists a slot window under the slot key, shared across games', () => {
    storage.seedPositions({
      'board:follow': { x: 300, y: 200, width: 500, height: 600 },
    });
    new WindowManager().open(followSlot('42'));
    expect(geometryOf(openCalls[0])).toEqual({
      left: 300,
      top: 200,
      width: 500,
      height: 600,
    });
  });

  it('does not cascade slot windows — one follow window stays anchored', () => {
    const wm = new WindowManager();
    wm.open(followSlot('1'));
    wm.open({ kind: 'board', id: '2', slot: 'playing' });
    expect(geometryOf(openCalls[0])).toMatchObject({ left: 320, top: 64 });
    expect(geometryOf(openCalls[1])).toMatchObject({ left: 320, top: 64 });
  });

  it('fires onClose when the user closes the window (poll-detected)', () => {
    const wm = new WindowManager();
    const popup = new FakePopup();
    nextPopup(popup);
    const onClose = vi.fn();
    wm.open({ ...followSlot('42'), onClose });

    popup.closed = true;
    vi.advanceTimersByTime(500);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not fire onClose when the manager closes the window itself', () => {
    const wm = new WindowManager();
    const popup = new FakePopup();
    nextPopup(popup);
    const onClose = vi.fn();
    wm.open({ ...followSlot('42'), onClose });

    wm.close(followSlot('42'));
    vi.advanceTimersByTime(500);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('fires onClose only once', () => {
    const wm = new WindowManager();
    const popup = new FakePopup();
    nextPopup(popup);
    const onClose = vi.fn();
    wm.open({ ...followSlot('42'), onClose });

    popup.closed = true;
    vi.advanceTimersByTime(500);
    vi.advanceTimersByTime(500);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ---- a blocked popup --------------------------------------------------------

describe('WindowManager — blocked popup', () => {
  it('returns null and tracks nothing when the browser refuses', () => {
    const wm = new WindowManager();
    nextPopup(null);

    expect(wm.open(board('42'))).toBeNull();
    expect(wm.isOpen(board('42'))).toBe(false);
  });

  it('lets a later retry open the same game', () => {
    // GameManager keeps the game in getOpenGameIds() when blocked precisely
    // so a retry is possible; this is the half of that contract that lives here.
    const wm = new WindowManager();
    nextPopup(null);
    wm.open(board('42'));

    const popup = new FakePopup();
    nextPopup(popup);
    expect(wm.open(board('42'))).toBe(popup);
    expect(openCalls).toHaveLength(2);
  });
});

// ---- the feature string -----------------------------------------------------

describe('WindowManager — window features', () => {
  it('asks for a chromeless popup, not a tab', () => {
    new WindowManager().open(board('42'));
    const f = parseFeatures(openCalls[0].features);
    // Valueless `popup` is the flag Chrome and Firefox actually key on; the
    // `=no` entries below it are legacy hints and must not replace it.
    expect(f.has('popup')).toBe(true);
    expect(f.get('menubar')).toBe('no');
    expect(f.get('toolbar')).toBe('no');
    expect(f.get('location')).toBe('no');
  });

  it('uses the per-kind default size when nothing is saved', () => {
    const wm = new WindowManager();
    wm.open(board('42'));
    wm.open({ kind: 'chat' });

    expect(geometryOf(openCalls[0])).toMatchObject({ width: 620, height: 700 });
    expect(geometryOf(openCalls[1])).toMatchObject({ width: 540, height: 620 });
  });

  it('lets the caller override the size', () => {
    new WindowManager().open({ kind: 'board', id: '42', width: 300, height: 200 });
    expect(geometryOf(openCalls[0])).toMatchObject({ width: 300, height: 200 });
  });

  it('lets the caller override the position', () => {
    new WindowManager().open({ kind: 'board', id: '42', x: 11, y: 22 });
    expect(geometryOf(openCalls[0])).toMatchObject({ left: 11, top: 22 });
  });
});

// ---- default placement ------------------------------------------------------

describe('WindowManager — default placement', () => {
  it('anchors each kind at its fraction of the available screen', () => {
    const wm = new WindowManager();
    wm.open(board('42'));
    wm.open({ kind: 'chat' });

    // board anchor 0.32 / 0.08 of 1000 x 800; chat 0.02 / 0.12.
    expect(geometryOf(openCalls[0])).toMatchObject({ left: 320, top: 64 });
    expect(geometryOf(openCalls[1])).toMatchObject({ left: 20, top: 96 });
  });

  it('offsets by availLeft/availTop so a second monitor is not ignored', () => {
    uninstallGlobals();
    installGlobals({ availLeft: 1000, availTop: 25 });
    new WindowManager().open(board('42'));
    expect(geometryOf(openCalls[0])).toMatchObject({ left: 1320, top: 89 });
  });

  it('falls back to screen.width/height when availWidth/Height are absent', () => {
    uninstallGlobals();
    installGlobals({
      availWidth: undefined,
      availHeight: undefined,
      width: 2000,
      height: 1600,
    });
    new WindowManager().open(board('42'));
    expect(geometryOf(openCalls[0])).toMatchObject({ left: 640, top: 128 });
  });

  it('cascades successive multi-instance windows by 40px', () => {
    const wm = new WindowManager();
    wm.open(board('1'));
    wm.open(board('2'));
    wm.open(board('3'));

    expect(geometryOf(openCalls[0])).toMatchObject({ left: 320, top: 64 });
    expect(geometryOf(openCalls[1])).toMatchObject({ left: 360, top: 104 });
    expect(geometryOf(openCalls[2])).toMatchObject({ left: 400, top: 144 });
  });

  it('wraps the cascade after six so windows stay on screen', () => {
    const wm = new WindowManager();
    for (let i = 1; i <= 7; i++) wm.open(board(String(i)));
    expect(geometryOf(openCalls[6])).toEqual(geometryOf(openCalls[0]));
  });

  it('does not cascade singleton windows', () => {
    const wm = new WindowManager();
    wm.open({ kind: 'chat' });
    wm.close({ kind: 'chat' });
    wm.open({ kind: 'chat' });
    expect(geometryOf(openCalls[1])).toEqual(geometryOf(openCalls[0]));
  });

  it('does not spend a cascade slot on a window that has a saved position', () => {
    // The saved branch short-circuits before cascadeIndex++, so board 2 is
    // still the first cascade step rather than the second.
    storage.seedPositions({
      'board:1': { x: 5, y: 6, width: 100, height: 120 },
    });
    const wm = new WindowManager();
    wm.open(board('1'));
    wm.open(board('2'));

    expect(geometryOf(openCalls[0])).toMatchObject({ left: 5, top: 6 });
    expect(geometryOf(openCalls[1])).toMatchObject({ left: 320, top: 64 });
  });
});

// ---- saved positions --------------------------------------------------------

describe('WindowManager — saved positions', () => {
  it('reopens a window where it was left, at the size it was left', () => {
    storage.seedPositions({
      'board:42': { x: 700, y: 300, width: 480, height: 500 },
    });
    new WindowManager().open(board('42'));
    expect(geometryOf(openCalls[0])).toEqual({
      left: 700,
      top: 300,
      width: 480,
      height: 500,
    });
  });

  it('reads the entry for this window only', () => {
    storage.seedPositions({
      'board:41': { x: 700, y: 300, width: 480, height: 500 },
    });
    new WindowManager().open(board('42'));
    expect(geometryOf(openCalls[0])).toMatchObject({ left: 320, top: 64 });
  });

  it('prefers an explicit spec position over the saved one', () => {
    storage.seedPositions({
      'board:42': { x: 700, y: 300, width: 480, height: 500 },
    });
    new WindowManager().open({ kind: 'board', id: '42', x: 0, y: 0 });
    // Size still comes from the saved record; only what was overridden moves.
    expect(geometryOf(openCalls[0])).toEqual({
      left: 0,
      top: 0,
      width: 480,
      height: 500,
    });
  });

  it('falls back to defaults when the stored JSON is corrupt', () => {
    storage.seedRaw('{ not json');
    expect(() => new WindowManager().open(board('42'))).not.toThrow();
    expect(geometryOf(openCalls[0])).toMatchObject({
      left: 320,
      top: 64,
      width: 620,
      height: 700,
    });
  });
});

// ---- keeping a window on a screen that exists -------------------------------

describe('WindowManager — clamping to the current screen', () => {
  // The screen these run against is 1000 x 800 at (0, 0), and a board is
  // 620 x 700, so the bounds are: x in [-500, 880], y in [0, 680].

  it('pulls back a window saved on a monitor that is no longer there', () => {
    // The failure this exists for: window.open succeeds, the popup is not
    // blocked, it reports itself open, and it is nowhere the user can look.
    storage.seedPositions({
      'board:42': { x: 2400, y: 300, width: 620, height: 700 },
    });
    new WindowManager().open(board('42'));
    expect(geometryOf(openCalls[0])).toMatchObject({ left: 880, top: 300 });
  });

  it('pulls back a window saved off the left of the screen', () => {
    storage.seedPositions({
      'board:42': { x: -1900, y: 300, width: 620, height: 700 },
    });
    new WindowManager().open(board('42'));
    expect(geometryOf(openCalls[0])).toMatchObject({ left: -500, top: 300 });
  });

  it('never opens a window with its top edge above the screen', () => {
    // Asymmetric on purpose: a window is dragged by its top, so one that
    // starts above the screen cannot be brought back down.
    storage.seedPositions({
      'board:42': { x: 100, y: -300, width: 620, height: 700 },
    });
    new WindowManager().open(board('42'));
    expect(geometryOf(openCalls[0])).toMatchObject({ left: 100, top: 0 });
  });

  it('pulls back a window saved below the bottom of the screen', () => {
    storage.seedPositions({
      'board:42': { x: 100, y: 1400, width: 620, height: 700 },
    });
    new WindowManager().open(board('42'));
    expect(geometryOf(openCalls[0])).toMatchObject({ left: 100, top: 680 });
  });

  it('leaves an overhang the user arranged deliberately alone', () => {
    // 800 + 620 runs 420px past the right edge and stays put — only the
    // unreachable case is a bug, and moving windows nobody moved is worse.
    storage.seedPositions({
      'board:42': { x: 800, y: 600, width: 620, height: 700 },
    });
    new WindowManager().open(board('42'));
    expect(geometryOf(openCalls[0])).toMatchObject({ left: 800, top: 600 });
  });

  it('clamps against the available area, not the raw screen', () => {
    // availLeft/availTop is where a second monitor or a menu bar shows up;
    // clamping to 0,0 would drop a window onto the wrong display.
    uninstallGlobals();
    installGlobals({ availLeft: 1000, availTop: 25 });
    storage.seedPositions({
      'board:42': { x: 0, y: 0, width: 620, height: 700 },
    });
    new WindowManager().open(board('42'));
    expect(geometryOf(openCalls[0])).toMatchObject({ left: 500, top: 25 });
  });

  it('clamps an explicit caller position too', () => {
    // Nothing gets to route around this: it is applied to whatever the
    // feature string is about to carry, whoever chose it.
    new WindowManager().open({ kind: 'board', id: '42', x: 9000, y: 9000 });
    expect(geometryOf(openCalls[0])).toMatchObject({ left: 880, top: 680 });
  });

  it('clamps position without touching the remembered size', () => {
    storage.seedPositions({
      'board:42': { x: 3000, y: 3000, width: 1400, height: 1200 },
    });
    new WindowManager().open(board('42'));
    // Bounds shift with the width: keep 120 visible of a 1400-wide window.
    expect(geometryOf(openCalls[0])).toEqual({
      left: 880,
      top: 680,
      width: 1400,
      height: 1200,
    });
  });

  it('keeps the top-left corner when the window is taller than the screen', () => {
    uninstallGlobals();
    installGlobals({ availWidth: 400, availHeight: 300, width: 400, height: 300 });
    storage.seedPositions({
      'board:42': { x: 0, y: 200, width: 620, height: 700 },
    });
    new WindowManager().open(board('42'));
    // maxY (300 - 120) is above screen.top only in degenerate cases; here it
    // is 180, so the saved 200 comes back to it rather than going negative.
    expect(geometryOf(openCalls[0])).toMatchObject({ left: 0, top: 180 });
  });

  it('leaves default and cascaded placements untouched', () => {
    // The clamp sits after the cascade, so it must not quietly become a
    // second placement rule for windows that were already on screen.
    const wm = new WindowManager();
    wm.open(board('1'));
    wm.open(board('2'));
    wm.open({ kind: 'chat' });

    expect(geometryOf(openCalls[0])).toMatchObject({ left: 320, top: 64 });
    expect(geometryOf(openCalls[1])).toMatchObject({ left: 360, top: 104 });
    expect(geometryOf(openCalls[2])).toMatchObject({ left: 20, top: 96 });
  });

  it('re-clamps on every open, so a shrunk resolution is noticed', () => {
    // The saved record is not rewritten — the manager's own poll will do that
    // once the popup reports where it actually landed.
    storage.seedPositions({
      'board:42': { x: 2400, y: 300, width: 620, height: 700 },
    });
    const wm = new WindowManager();
    wm.open(board('42'));
    wm.close(board('42'));
    wm.open(board('42'));

    expect(geometryOf(openCalls[1])).toMatchObject({ left: 880, top: 300 });
    expect(storage.positions()['board:42']).toMatchObject({ x: 2400 });
  });
});

// ---- position persistence ---------------------------------------------------

describe('WindowManager — persisting where the user put a window', () => {
  it('records the popup position once the poll comes round', () => {
    const wm = new WindowManager();
    const popup = new FakePopup();
    nextPopup(popup);
    wm.open(board('42'));

    expect(storage.positions()['board:42']).toBeUndefined();

    Object.assign(popup, {
      screenX: 101,
      screenY: 202,
      outerWidth: 640,
      outerHeight: 720,
    });
    vi.advanceTimersByTime(1500);

    expect(storage.positions()['board:42']).toEqual({
      x: 101,
      y: 202,
      width: 640,
      height: 720,
    });
  });

  it('merges rather than clobbering other windows records', () => {
    storage.seedPositions({
      chat: { x: 1, y: 2, width: 3, height: 4 },
    });
    const wm = new WindowManager();
    const popup = new FakePopup();
    nextPopup(popup);
    wm.open(board('42'));
    vi.advanceTimersByTime(1500);

    expect(storage.positions().chat).toEqual({ x: 1, y: 2, width: 3, height: 4 });
    expect(storage.positions()['board:42']).toBeDefined();
  });

  it('round-trips: what one session persists is where the next one opens', () => {
    const first = new WindowManager();
    const popup = new FakePopup();
    nextPopup(popup);
    first.open(board('42'));
    Object.assign(popup, {
      screenX: 88,
      screenY: 99,
      outerWidth: 500,
      outerHeight: 600,
    });
    vi.advanceTimersByTime(1500);

    // A fresh manager over the same storage — i.e. a page reload.
    new WindowManager().open(board('42'));
    expect(geometryOf(openCalls[1])).toEqual({
      left: 88,
      top: 99,
      width: 500,
      height: 600,
    });
  });

  it('stops polling a window the user has closed', () => {
    const wm = new WindowManager();
    const popup = new FakePopup();
    nextPopup(popup);
    wm.open(board('42'));
    vi.advanceTimersByTime(1500);
    const recorded = storage.positions()['board:42'];

    popup.closed = true;
    Object.assign(popup, { screenX: 999, screenY: 999 });
    vi.advanceTimersByTime(10_000);

    expect(storage.positions()['board:42']).toEqual(recorded);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('forgets a window that closed itself, so the next open is a real open', () => {
    const wm = new WindowManager();
    const popup = new FakePopup();
    nextPopup(popup);
    wm.open(board('42'));

    popup.closed = true;
    vi.advanceTimersByTime(500);

    wm.open(board('42'));
    expect(openCalls).toHaveLength(2);
    expect(popup.focusCount).toBe(0);
  });

  it('survives storage being unwritable', () => {
    const wm = new WindowManager();
    const popup = new FakePopup();
    nextPopup(popup);
    wm.open(board('42'));

    storage.failWrites = true;
    expect(() => vi.advanceTimersByTime(1500)).not.toThrow();
  });
});

// ---- the singleton ----------------------------------------------------------

describe('getWindowManager', () => {
  it('returns the same manager every time, so cascade state is shared', () => {
    const a = getWindowManager();
    expect(getWindowManager()).toBe(a);

    a.open(board('1'));
    getWindowManager().open(board('2'));
    expect(geometryOf(openCalls[1])).toMatchObject({ left: 360, top: 104 });
  });

  it('hangs the manager on the window it was called in', () => {
    // Popups have their own `window`, which is why appContext.ts only calls
    // this on the main window — a popup calling it would get a second manager
    // tracking nothing.
    const first = getWindowManager();
    uninstallGlobals();
    installGlobals();
    expect(getWindowManager()).not.toBe(first);
  });
});

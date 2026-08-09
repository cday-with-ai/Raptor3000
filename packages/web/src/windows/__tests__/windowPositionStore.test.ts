import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  POSITION_STORAGE_KEY,
  loadPosition,
  loadPositions,
  savePosition,
  savePositions,
  windowStorageKey,
} from '../windowPositionStore.js';
import { installPositionTracker } from '../windowPosition.js';
import { WindowManager } from '../WindowManager.js';

/**
 * `WindowManager` and `windowPosition.ts` both write remembered window
 * positions, and until now each declared the storage key, the record shape and
 * its own load/save pair, with a comment in each saying it must match the
 * other. They did match; the point of these tests is that they go on matching.
 *
 * The two that matter most are at the bottom: a position written by the popup
 * is the one the manager reopens at, and vice versa. Everything above them
 * pins the pieces those two rest on.
 *
 * No jsdom. The store touches `localStorage`; the tracker touches
 * `window.addEventListener`, the window's own geometry and two timers; the
 * manager touches `window.open`, `window.screen` and `location`. All are
 * faked on `globalThis`, which is how the neighbouring windowManager test
 * works too.
 */

// ---- fakes -----------------------------------------------------------------

class FakeStorage {
  private data = new Map<string, string>();
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
  /** Test-side view of the raw string, to pin the key itself. */
  raw(key: string): string | null {
    return this.getItem(key);
  }
  seedRaw(value: string): void {
    this.data.set(POSITION_STORAGE_KEY, value);
  }
}

class FakePopup {
  closed = false;
  screenX = 0;
  screenY = 0;
  outerWidth = 0;
  outerHeight = 0;
  focus(): void {}
  close(): void {
    this.closed = true;
  }
}

interface OpenCall {
  url: string;
  name: string;
  features: string;
}

let storage: FakeStorage;
let openCalls: OpenCall[];
let openResults: (FakePopup | null)[];
let listeners: Map<string, Set<() => void>>;
/** The geometry the "current window" reports — i.e. the popup's own. */
let self: { screenX: number; screenY: number; outerWidth: number; outerHeight: number };

function installGlobals(): void {
  storage = new FakeStorage();
  openCalls = [];
  openResults = [];
  listeners = new Map();
  self = { screenX: 0, screenY: 0, outerWidth: 0, outerHeight: 0 };

  const fakeWindow = {
    screen: {
      availLeft: 0,
      availTop: 0,
      availWidth: 1600,
      availHeight: 1000,
      width: 1600,
      height: 1000,
    },
    get screenX() {
      return self.screenX;
    },
    get screenY() {
      return self.screenY;
    },
    get outerWidth() {
      return self.outerWidth;
    },
    get outerHeight() {
      return self.outerHeight;
    },
    open(url: string, name: string, features: string): FakePopup | null {
      openCalls.push({ url, name, features });
      const next = openResults.shift();
      return next === undefined ? new FakePopup() : next;
    },
    addEventListener(type: string, fn: () => void): void {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener(type: string, fn: () => void): void {
      listeners.get(type)?.delete(fn);
    },
    // Delegate to the (faked) globals so vitest's clock drives the tracker.
    setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
    clearTimeout: (h: number) => clearTimeout(h),
    setInterval: (fn: () => void, ms: number) => setInterval(fn, ms),
    clearInterval: (h: number) => clearInterval(h),
  };

  Object.assign(globalThis, {
    window: fakeWindow,
    localStorage: storage,
    location: { pathname: '/' },
  });
}

function uninstallGlobals(): void {
  for (const k of ['window', 'localStorage', 'location']) {
    delete (globalThis as Record<string, unknown>)[k];
  }
}

function fire(type: string): void {
  for (const fn of listeners.get(type) ?? []) fn();
}

function geometryOf(call: OpenCall): Record<string, number> {
  const out: Record<string, number> = {};
  for (const part of call.features.split(',')) {
    const eq = part.indexOf('=');
    if (eq !== -1) out[part.slice(0, eq)] = Number(part.slice(eq + 1));
  }
  return out;
}

beforeEach(() => {
  installGlobals();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  uninstallGlobals();
});

// ---- the key ---------------------------------------------------------------

describe('windowStorageKey', () => {
  it('keys a singleton window on its kind alone', () => {
    expect(windowStorageKey('chat')).toBe('chat');
  });

  it('keys a multi-instance window on kind:id', () => {
    expect(windowStorageKey('board', '42')).toBe('board:42');
  });

  it('falls back to the bare kind when a board has no id', () => {
    // Not reachable today — the manager always writes `?id=`, so a board popup
    // always has one. Pinned because it is the shape of the divergence if it
    // ever becomes reachable: the popup would save under `board` while the
    // manager reopens from `board:42`, i.e. a window that forgets its place
    // rather than one that errors.
    expect(windowStorageKey('board', null)).toBe('board');
    expect(windowStorageKey('board', undefined)).toBe('board');
    expect(windowStorageKey('board', '')).toBe('board');
  });
});

// ---- the map -------------------------------------------------------------

describe('position storage', () => {
  it('stores everything under one versioned localStorage key', () => {
    // Changing this string silently forgets every remembered layout, so it is
    // worth having to edit a test to do it.
    savePosition('board:42', { x: 1, y: 2, width: 3, height: 4 });
    expect(POSITION_STORAGE_KEY).toBe('raptor3000.windowPositions.v1');
    expect(storage.raw('raptor3000.windowPositions.v1')).not.toBeNull();
  });

  it('round-trips a record', () => {
    savePosition('board:42', { x: 10, y: 20, width: 300, height: 400 });
    expect(loadPosition('board:42')).toEqual({
      x: 10,
      y: 20,
      width: 300,
      height: 400,
    });
  });

  it('leaves other windows alone when one window moves', () => {
    savePosition('chat', { x: 1, y: 2, width: 3, height: 4 });
    savePosition('board:42', { x: 5, y: 6, width: 7, height: 8 });
    savePosition('chat', { x: 9, y: 9, width: 9, height: 9 });

    expect(loadPosition('board:42')).toEqual({ x: 5, y: 6, width: 7, height: 8 });
    expect(Object.keys(loadPositions()).sort()).toEqual(['board:42', 'chat']);
  });

  it('reports no saved position rather than throwing on an unknown key', () => {
    expect(loadPosition('board:99')).toBeUndefined();
    expect(loadPositions()).toEqual({});
  });

  it('treats a corrupt map as no saved positions', () => {
    storage.seedRaw('{not json');
    expect(loadPositions()).toEqual({});
    expect(loadPosition('chat')).toBeUndefined();
  });

  it('swallows a failed write', () => {
    // Private browsing and a full quota both throw from setItem. Forgetting a
    // position is acceptable; taking the window open path down with it is not.
    storage.failWrites = true;
    expect(() => savePosition('chat', { x: 1, y: 2, width: 3, height: 4 })).not.toThrow();
    expect(() => savePositions({})).not.toThrow();
  });
});

// ---- the seam the two writers share ----------------------------------------

describe('the popup writer and the manager reader agree', () => {
  it('reopens a board where the popup last recorded itself', () => {
    // The popup's own final write is the one the 1500ms poll cannot make —
    // by the time it fires again the handle is `closed`. So this path is the
    // only thing that remembers where a window was when it was shut.
    const key = windowStorageKey('board', '42');
    const dispose = installPositionTracker(key);

    self.screenX = 640;
    self.screenY = 180;
    self.outerWidth = 700;
    self.outerHeight = 820;
    fire('pagehide');
    // Asserted before the disposer runs: the disposer writes too, and would
    // otherwise cover for a `pagehide` handler that had stopped being wired.
    expect(loadPosition(key)).toEqual({ x: 640, y: 180, width: 700, height: 820 });
    dispose();

    new WindowManager().open({ kind: 'board', id: '42' });

    expect(openCalls[0].name).toBe(key);
    expect(geometryOf(openCalls[0])).toMatchObject({
      left: 640,
      top: 180,
      width: 700,
      height: 820,
    });
  });

  it('lets the popup update a position the manager wrote', () => {
    // The other direction: the manager's poll records a window the user moved
    // and left open, then the popup overwrites it on close. Both land on the
    // same key or the second write creates a second, unread record.
    const popup = new FakePopup();
    openResults.push(popup);
    new WindowManager().open({ kind: 'board', id: '42' });

    popup.screenX = 100;
    popup.screenY = 110;
    popup.outerWidth = 620;
    popup.outerHeight = 700;
    vi.advanceTimersByTime(1500);
    expect(loadPosition('board:42')).toMatchObject({ x: 100, y: 110 });

    const dispose = installPositionTracker(windowStorageKey('board', '42'));
    self.screenX = 900;
    self.screenY = 300;
    self.outerWidth = 620;
    self.outerHeight = 700;
    fire('pagehide');
    dispose();

    expect(Object.keys(loadPositions())).toEqual(['board:42']);
    expect(loadPosition('board:42')).toMatchObject({ x: 900, y: 300 });
  });

  it('gives the chat popup the same key the manager opens it under', () => {
    // Chat is the singleton case: no id on either side, so a mismatch here
    // would look like a chat window that never remembers anything.
    const dispose = installPositionTracker(windowStorageKey('chat'));
    self.screenX = 30;
    self.screenY = 60;
    self.outerWidth = 540;
    self.outerHeight = 620;
    fire('pagehide');
    dispose();

    new WindowManager().open({ kind: 'chat' });
    expect(openCalls[0].name).toBe('chat');
    expect(geometryOf(openCalls[0])).toMatchObject({ left: 30, top: 60 });
  });

  it('still clamps a popup-written position onto a screen that exists', () => {
    // The popup writes raw `screenX`, so a window last closed on a monitor
    // that is now unplugged goes through this path as an off-screen record.
    const dispose = installPositionTracker(windowStorageKey('board', '7'));
    self.screenX = 3400;
    self.screenY = 40;
    self.outerWidth = 620;
    self.outerHeight = 700;
    fire('pagehide');
    dispose();

    new WindowManager().open({ kind: 'board', id: '7' });
    // 1600 wide screen, 120px must stay visible.
    expect(geometryOf(openCalls[0]).left).toBe(1480);
    // …and the stored record is left as written; the clamp is open-time only.
    expect(loadPosition('board:7')).toMatchObject({ x: 3400 });
  });
});

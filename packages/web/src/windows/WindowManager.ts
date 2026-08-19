/**
 * Window lifecycle + position persistence.
 *
 * Modeled on Decaf's GUIManager (https://github.com/carson-day/decaf-chess-interface,
 * `source/decaf/gui/GUIManager.java`), ported to browser popups.
 *
 *   - One MainWindow (the anchor). If closed, all board popups go inert.
 *   - Board windows are popups opened via `window.open(..., _blank, "...")`.
 *   - Each window URL carries its identity (`?window=board&id=42`). The param
 *     is `id`, not `game` — App.tsx reads `id` and hands it on as `gameId`.
 *   - Positions are cascaded if the user didn't persist a per-game layout,
 *     and are clamped onto a screen that currently exists before use — a
 *     saved layout outlives the monitor it was made on.
 *   - Shared state: popups read `window.opener.raptor` — the main window
 *     hangs all stores + services on `window.raptor` at startup.
 *
 * This is Decaf's design: separate OS-level windows per game, a persistent
 * chat window, and a standalone seek window. The browser's popup API lines
 * up naturally with it.
 */

import {
  loadPosition,
  savePosition,
  windowStorageKey,
  type StoredPosition,
  type WindowKind,
} from './windowPositionStore.js';

export type { WindowKind };

export interface OpenWindowSpec {
  kind: WindowKind;
  /** For 'board' — the game id. For everything else, stable singleton. */
  id?: string;
  /** Stable identity shared across games: the window keeps its position
   *  while the game it shows changes. A slot window ('follow', 'playing')
   *  is *replaced* when the game changes — the old popup closes and a new
   *  one opens in its place — so following a player never piles up
   *  windows. The storage key comes from the slot, not the id. */
  slot?: string;
  /** Fired when this window closes. Only poll-detected user closes fire
   *  it — a close the manager itself initiates does not. */
  onClose?: () => void;
  /** Initial width/height. Position is managed by cascadePoint or saved prefs. */
  width?: number;
  height?: number;
  /** Optional explicit position; else cascaded. */
  x?: number;
  y?: number;
}

const CASCADE_STEP = 40;
const DEFAULTS: Record<WindowKind, { width: number; height: number }> = {
  main:        { width: 420, height: 260 },
  chat:        { width: 540, height: 620 },
  board:       { width: 620, height: 700 },
  bugEar:      { width: 360, height: 260 },
  preferences: { width: 600, height: 500 },
};

/**
 * Per-kind default "anchor" for the top-left corner, as a fraction of the
 * available screen. Chat left, board center, seek right — so opening all
 * three at once gives a usable layout without manual arrangement.
 */
const DEFAULT_ANCHOR: Record<WindowKind, { fx: number; fy: number }> = {
  main:        { fx: 0.02, fy: 0.04 },
  chat:        { fx: 0.02, fy: 0.12 },
  board:       { fx: 0.32, fy: 0.08 },
  bugEar:      { fx: 0.68, fy: 0.58 },
  preferences: { fx: 0.30, fy: 0.25 },
};

/**
 * How much of a window has to stay inside the available screen.
 *
 * A saved position is replayed verbatim, so a monitor that has been unplugged
 * — or a resolution that shrank — would otherwise hand `window.open` something
 * like `left=2400` on a 1000px screen. The popup is not blocked, reports
 * itself open, and is nowhere the user can see: indistinguishable, from the
 * outside, from a board that never opened.
 *
 * 120px is enough of a frame to notice and to grab.
 */
const MIN_VISIBLE = 120;

function storageKeyFor(spec: OpenWindowSpec): string {
  return windowStorageKey(spec.kind, spec.slot ?? spec.id);
}

export class WindowManager {
  private readonly openWindows = new Map<string, Window>();
  /** onClose callbacks by window key — see OpenWindowSpec.onClose. */
  private readonly closeCallbacks = new Map<string, () => void>();
  /** How many times each slot has been replaced — see `windowName`. */
  private readonly generation = new Map<string, number>();
  private cascadeIndex = 0;

  /**
   * Open (or focus, if already open) a subordinate window.
   * Returns the Window reference, or null if the browser blocked the popup.
   *
   * A slot window whose game has changed is **replaced**, not navigated:
   * the old popup is closed and a fresh one opened in its place. That is a
   * deliberate trade for one thing a navigation cannot buy — a brand-new
   * popup is raised to the front by the browser, where `focus()` on a
   * window that already exists is subject to the OS window manager's
   * focus-stealing prevention and commonly does nothing but flash a
   * taskbar entry (Carson, 2026-08-19). A game starting is exactly when
   * the board needs to be in front of you.
   */
  open(spec: OpenWindowSpec): Window | null {
    const key = storageKeyFor(spec);
    const existing = this.openWindows.get(key);
    const live = existing && !existing.closed ? existing : null;
    // Only a slot window is ever replaced, and only when the game on
    // screen is not the one being asked for.
    const superseded = live && spec.slot && !this.showsSameGame(live, spec) ? live : null;

    if (live && !superseded) {
      if (spec.onClose) this.closeCallbacks.set(key, spec.onClose);
      live.focus();
      return live;
    }

    if (superseded) {
      // The user's most recent drag is up to a poll interval newer than
      // the stored record, so read the geometry off the window that is
      // about to go. The replacement then opens exactly on top of it.
      this.captureGeometry(key, superseded);
      // The successor cannot share the doomed window's name: `window.open`
      // targeting an existing name navigates that window instead of
      // opening one, which is the behaviour being replaced.
      this.generation.set(key, (this.generation.get(key) ?? 0) + 1);
    }

    const url = this.urlFor(spec);
    const features = this.featuresFor(spec);
    const win = window.open(url, this.windowName(key), features);
    if (!win) {
      // Blocked. The old window is still standing and still shows a game;
      // that beats a slot with nothing in it, so it is left alone and the
      // caller hears about the block as it would for any other open.
      return null;
    }

    if (superseded) this.retire(key, superseded);
    if (spec.onClose) this.closeCallbacks.set(key, spec.onClose);
    this.openWindows.set(key, win);
    this.attachPersistence(key, win);
    this.watchForClose(key, win);
    // No focus() here on purpose. A window the browser has just created is
    // raised by the browser; `focus()` is reserved for the one case it is
    // actually needed — a window that already existed — so a test asserting
    // on it is asserting about the path taken, not about noise.
    return win;
  }

  /** Close a specific subordinate window. */
  close(spec: OpenWindowSpec): void {
    const key = storageKeyFor(spec);
    const win = this.openWindows.get(key);
    if (win && !win.closed) win.close();
    this.openWindows.delete(key);
    this.closeCallbacks.delete(key);
  }

  /** Close all subordinate windows (e.g. on logout). */
  closeAll(): void {
    for (const win of this.openWindows.values()) {
      if (!win.closed) win.close();
    }
    this.openWindows.clear();
    this.closeCallbacks.clear();
  }

  isOpen(spec: OpenWindowSpec): boolean {
    const win = this.openWindows.get(storageKeyFor(spec));
    return !!win && !win.closed;
  }

  // ---- private helpers ----

  private urlFor(spec: OpenWindowSpec): string {
    const params = new URLSearchParams({ window: spec.kind });
    if (spec.id) params.set('id', spec.id);
    // A slot window's identity in the URL is the game id it shows; the
    // slot itself is a hint so the popup can key its position persistence
    // on the slot rather than the game (App.tsx reads both).
    if (spec.slot) params.set('slot', spec.slot);
    return `${location.pathname}?${params.toString()}`;
  }

  /**
   * Is this window already showing the game the spec asks for?
   *
   * Comparison is on the query string, not the whole href: a browser
   * resolves `location.href` to an absolute URL, so a relative compare
   * would never match and every focus would replace the window.
   *
   * A handle that cannot be read is cross-origin, and the answer is
   * "yes" — deliberately the conservative direction, because the cost of
   * guessing wrong here is closing a window we know nothing about.
   */
  private showsSameGame(win: Window, spec: OpenWindowSpec): boolean {
    try {
      const target = new URL(this.urlFor(spec), 'https://raptor.invalid');
      return win.location.search === target.search;
    } catch {
      return true;
    }
  }

  /** The name handed to `window.open`. Bare key until the slot has been
   *  replaced at least once; the generation suffix only exists to keep a
   *  successor from being handed to its predecessor's name. */
  private windowName(key: string): string {
    const gen = this.generation.get(key) ?? 0;
    return gen === 0 ? key : `${key}#${gen}`;
  }

  /** Store a live window's geometry under `key` right now. */
  private captureGeometry(key: string, win: Window): void {
    savePosition(key, {
      x: win.screenX,
      y: win.screenY,
      width: win.outerWidth,
      height: win.outerHeight,
    });
  }

  /**
   * Close a window the manager itself is replacing.
   *
   * The handle leaves the map *before* it is closed, so the close poller
   * sees a key that no longer belongs to it and stays quiet. That matters
   * beyond tidiness: `onClose` on the follow slot sends FICS's `follow`
   * off-switch, and a replacement is not the user closing anything.
   */
  private retire(key: string, win: Window): void {
    this.openWindows.delete(key);
    this.closeCallbacks.delete(key);
    win.close();
  }

  private featuresFor(spec: OpenWindowSpec): string {
    const defaults = DEFAULTS[spec.kind];
    const saved = loadPosition(storageKeyFor(spec));
    const width = spec.width ?? saved?.width ?? defaults.width;
    const height = spec.height ?? saved?.height ?? defaults.height;
    const pos = saved ?? this.defaultPosition(spec, width, height);
    // Clamped last, so nothing — saved record, explicit caller, or cascade —
    // can hand the browser a position off the screen the user currently has.
    const { x, y } = this.clampToScreen(
      spec.x ?? pos.x,
      spec.y ?? pos.y,
      width,
      height,
    );
    // `popup` (canonical, no value) is what MDN documents and is the flag
    // Chrome/Firefox use to render a chromeless popup instead of a tab.
    // The explicit `=no` entries are legacy hints some older browsers
    // still honor (notably Firefox when user prefs allow).
    return [
      `popup`,
      `width=${width}`,
      `height=${height}`,
      `left=${x}`,
      `top=${y}`,
      `menubar=no`,
      `toolbar=no`,
      `location=no`,
      `status=no`,
      `titlebar=no`,
      `directories=no`,
    ].join(',');
  }

  /**
   * Default opening position for a window that's never been opened before.
   * Uses per-kind anchors so the default layout is immediately usable, then
   * cascades subsequent boards of the same kind so multiple games don't stack.
   */
  private defaultPosition(
    spec: OpenWindowSpec,
    width: number,
    height: number,
  ): StoredPosition {
    const screen = this.availableScreen();
    const anchor = DEFAULT_ANCHOR[spec.kind];
    const baseX = screen.left + Math.round(anchor.fx * screen.width);
    const baseY = screen.top + Math.round(anchor.fy * screen.height);

    // Cascade offset only for multi-instance windows (boards, bugEar).
    // A slot window is a singleton in its slot — one follow window, one
    // playing window — so it anchors and stays wherever the user puts it.
    const cascade = spec.id && !spec.slot ? this.cascadeIndex++ % 6 : 0;
    const x = baseX + cascade * CASCADE_STEP;
    const y = baseY + cascade * CASCADE_STEP;
    return { x, y, width, height };
  }

  /**
   * Pull a position back onto a screen that exists right now.
   *
   * The two axes deliberately have different rules. Horizontally a window may
   * hang off either edge as long as MIN_VISIBLE of it remains — overhang is an
   * ordinary thing for a user to have arranged on purpose, and forcing the
   * whole window into view would move windows nobody asked to move.
   * Vertically the top edge is never allowed above the available area: a
   * window is dragged by its top, so one that starts above the screen cannot
   * be brought back, whereas one hanging off the side still can.
   *
   * Size is left alone. A window wider than the screen is awkward, not
   * invisible, and shrinking a remembered size is a different decision.
   */
  private clampToScreen(
    x: number,
    y: number,
    width: number,
    height: number,
  ): { x: number; y: number } {
    const screen = this.availableScreen();
    const keepX = Math.min(width, MIN_VISIBLE);
    const keepY = Math.min(height, MIN_VISIBLE);

    const minX = screen.left - (width - keepX);
    const maxX = screen.left + screen.width - keepX;
    const maxY = screen.top + screen.height - keepY;

    // `max(lo, min(v, hi))` rather than the other order: if a screen is so
    // small the bounds cross, the top-left corner is the half worth keeping.
    return {
      x: Math.max(minX, Math.min(x, maxX)),
      y: Math.max(screen.top, Math.min(y, maxY)),
    };
  }

  private availableScreen(): {
    left: number;
    top: number;
    width: number;
    height: number;
  } {
    // Prefer window.screen.availLeft/Top/Width/Height when exposed; fall back
    // to screen.width/height.
    const s = window.screen as Screen & {
      availLeft?: number;
      availTop?: number;
    };
    return {
      left: s.availLeft ?? 0,
      top: s.availTop ?? 0,
      width: s.availWidth ?? s.width,
      height: s.availHeight ?? s.height,
    };
  }

  /** Once the popup loads, start watching for move/resize so we can persist. */
  private attachPersistence(key: string, win: Window): void {
    const persist = () => {
      if (win.closed) return;
      savePosition(key, {
        x: win.screenX,
        y: win.screenY,
        width: win.outerWidth,
        height: win.outerHeight,
      });
    };
    // Poll — modern browsers don't fire reliable move events across windows.
    const interval = setInterval(() => {
      if (win.closed) {
        clearInterval(interval);
        return;
      }
      persist();
    }, 1500);
  }

  private watchForClose(key: string, win: Window): void {
    const interval = setInterval(() => {
      if (!win.closed) return;
      clearInterval(interval);
      // Identity, not the key: a slot that has been replaced still has a
      // window under this key, and it is the successor. Firing here would
      // evict a live window from the map and run its onClose.
      if (this.openWindows.get(key) !== win) return;
      this.openWindows.delete(key);
      this.closeCallbacks.get(key)?.();
      this.closeCallbacks.delete(key);
    }, 500);
  }
}

/** Global WindowManager singleton, lives on the main window only. */
export function getWindowManager(): WindowManager {
  const host = window as unknown as { __raptorWindowManager?: WindowManager };
  if (!host.__raptorWindowManager) {
    host.__raptorWindowManager = new WindowManager();
  }
  return host.__raptorWindowManager;
}

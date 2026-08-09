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
 *   - Positions are cascaded if the user didn't persist a per-game layout.
 *   - Shared state: popups read `window.opener.raptor` — the main window
 *     hangs all stores + services on `window.raptor` at startup.
 *
 * This is Decaf's design: separate OS-level windows per game, a persistent
 * chat window, and a standalone seek window. The browser's popup API lines
 * up naturally with it.
 */

export type WindowKind =
  | 'main'
  | 'chat'
  | 'board'
  | 'bugEar'
  | 'preferences';

export interface OpenWindowSpec {
  kind: WindowKind;
  /** For 'board' — the game id. For everything else, stable singleton. */
  id?: string;
  /** Initial width/height. Position is managed by cascadePoint or saved prefs. */
  width?: number;
  height?: number;
  /** Optional explicit position; else cascaded. */
  x?: number;
  y?: number;
}

interface StoredPosition {
  x: number;
  y: number;
  width: number;
  height: number;
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

const STORAGE_KEY = 'raptor3000.windowPositions.v1';

type PositionMap = Record<string, StoredPosition>;

function storageKeyFor(spec: OpenWindowSpec): string {
  return spec.id ? `${spec.kind}:${spec.id}` : spec.kind;
}

function loadPositions(): PositionMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PositionMap;
  } catch {
    return {};
  }
}

function savePositions(map: PositionMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / disabled-storage
  }
}

export class WindowManager {
  private readonly openWindows = new Map<string, Window>();
  private cascadeIndex = 0;

  /**
   * Open (or focus, if already open) a subordinate window.
   * Returns the Window reference, or null if the browser blocked the popup.
   */
  open(spec: OpenWindowSpec): Window | null {
    const key = storageKeyFor(spec);
    const existing = this.openWindows.get(key);
    if (existing && !existing.closed) {
      existing.focus();
      return existing;
    }

    const url = this.urlFor(spec);
    const features = this.featuresFor(spec);
    const win = window.open(url, key, features);
    if (!win) return null;

    this.openWindows.set(key, win);
    this.attachPersistence(key, win);
    this.watchForClose(key, win);
    return win;
  }

  /** Close a specific subordinate window. */
  close(spec: OpenWindowSpec): void {
    const key = storageKeyFor(spec);
    const win = this.openWindows.get(key);
    if (win && !win.closed) win.close();
    this.openWindows.delete(key);
  }

  /** Close all subordinate windows (e.g. on logout). */
  closeAll(): void {
    for (const win of this.openWindows.values()) {
      if (!win.closed) win.close();
    }
    this.openWindows.clear();
  }

  isOpen(spec: OpenWindowSpec): boolean {
    const win = this.openWindows.get(storageKeyFor(spec));
    return !!win && !win.closed;
  }

  // ---- private helpers ----

  private urlFor(spec: OpenWindowSpec): string {
    const params = new URLSearchParams({ window: spec.kind });
    if (spec.id) params.set('id', spec.id);
    return `${location.pathname}?${params.toString()}`;
  }

  private featuresFor(spec: OpenWindowSpec): string {
    const defaults = DEFAULTS[spec.kind];
    const saved = loadPositions()[storageKeyFor(spec)];
    const width = spec.width ?? saved?.width ?? defaults.width;
    const height = spec.height ?? saved?.height ?? defaults.height;
    const pos = saved ?? this.defaultPosition(spec, width, height);
    const x = spec.x ?? pos.x;
    const y = spec.y ?? pos.y;
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
    const cascade = spec.id ? this.cascadeIndex++ % 6 : 0;
    const x = baseX + cascade * CASCADE_STEP;
    const y = baseY + cascade * CASCADE_STEP;
    return { x, y, width, height };
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
      const positions = loadPositions();
      positions[key] = {
        x: win.screenX,
        y: win.screenY,
        width: win.outerWidth,
        height: win.outerHeight,
      };
      savePositions(positions);
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
      if (win.closed) {
        this.openWindows.delete(key);
        clearInterval(interval);
      }
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

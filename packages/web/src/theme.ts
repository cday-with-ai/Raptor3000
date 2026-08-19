/**
 * UI theme mode persistence + resolution.
 *
 *   ThemeMode = 'light' | 'dark' | 'system'
 *
 * `system` honors `prefers-color-scheme`. The resolved value is
 * reflected to `document.documentElement.dataset.theme` so the CSS
 * variable palette in `index.css` swaps. A MediaQueryList listener
 * keeps `system` reactive to OS changes during a session.
 *
 * Board and chat windows are real `window.open` popups with their own
 * documents, so a theme applied in main reaches only main. `installThemeSync`
 * (bottom of this file) is what every document runs to keep itself in step:
 * the mode lives in localStorage, which same-origin windows share, and a
 * `storage` event tells every *other* document that it changed.
 */

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

/** localStorage key the mode is persisted under. Also what `storage` events carry. */
export const THEME_STORAGE_KEY = 'pref.uiTheme';

export function loadThemeMode(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    // ignore
  }
  return 'system';
}

export function saveThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'light' || mode === 'dark') return mode;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  }
  return 'dark';
}

export function readDocumentTheme(): ResolvedTheme {
  if (typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light') {
    return 'light';
  }
  return 'dark';
}

export function applyTheme(mode: ThemeMode): ResolvedTheme {
  const resolved = resolveTheme(mode);
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = resolved;
  }
  return resolved;
}

/**
 * Subscribe to OS-theme changes when mode = 'system'. Returns a cleanup
 * function. Handy for a React `useEffect` dependency on the current
 * mode preference.
 */
export function watchSystemTheme(
  onChange: (resolved: ResolvedTheme) => void,
): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  const handler = (ev: MediaQueryListEvent) => {
    onChange(ev.matches ? 'light' : 'dark');
  };
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}

/**
 * Everything `installThemeSync` needs from the document it is syncing.
 *
 * This exists so the sync logic can be tested without a DOM: the browser
 * implementation is `browserThemeEnvironment()` below, and a test passes
 * fakes. `resolve` is part of the seam rather than a direct call to
 * `resolveTheme` because resolving `system` needs `matchMedia`.
 */
export interface ThemeEnvironment {
  /** Read the persisted mode for this origin. */
  readMode(): ThemeMode;
  /** Resolve a mode to the palette that should be showing. */
  resolve(mode: ThemeMode): ResolvedTheme;
  /** Reflect a resolved palette onto this window's document. */
  reflect(resolved: ResolvedTheme): void;
  /**
   * Subscribe to cross-window storage writes. The handler is called with the
   * key that changed, or `null` for a whole-store clear. Returns cleanup.
   */
  onStorage(handler: (key: string | null) => void): () => void;
  /** Subscribe to OS light/dark flips. Returns cleanup. */
  onSystemChange(handler: () => void): () => void;
}

export function browserThemeEnvironment(): ThemeEnvironment {
  return {
    readMode: loadThemeMode,
    resolve: resolveTheme,
    reflect(resolved) {
      if (typeof document !== 'undefined') {
        document.documentElement.dataset.theme = resolved;
      }
    },
    onStorage(handler) {
      if (typeof window === 'undefined') return () => {};
      const listener = (ev: StorageEvent) => handler(ev.key);
      window.addEventListener('storage', listener);
      return () => window.removeEventListener('storage', listener);
    },
    onSystemChange(handler) {
      return watchSystemTheme(() => handler());
    },
  };
}

/**
 * Keep this document's palette in step with the stored mode, for the life of
 * the document. Applies the current mode immediately, then re-applies on:
 *
 *   - a `storage` event for the theme key — i.e. *another* same-origin window
 *     changed the mode. The window that wrote it does not get this event, so
 *     whoever edits the mode must still apply it itself (MainWindow does).
 *   - an OS light/dark flip. The listener is unconditional rather than
 *     mode-gated: re-applying an explicit `light`/`dark` is a no-op, and a
 *     gated listener would have to be torn down and rebuilt on every mode
 *     change to notice that `system` had been selected in another window.
 *
 * Returns a cleanup function. `main.tsx` calls this once per document — main
 * and every popup run the same bundle — and never cleans up, which is correct:
 * the subscription should outlive React.
 */
export function installThemeSync(
  env: ThemeEnvironment = browserThemeEnvironment(),
): () => void {
  const applyCurrent = () => {
    env.reflect(env.resolve(env.readMode()));
  };

  applyCurrent();

  const offStorage = env.onStorage((key) => {
    // `null` is a whole-store clear, which drops the mode too.
    if (key !== null && key !== THEME_STORAGE_KEY) return;
    applyCurrent();
  });
  const offSystem = env.onSystemChange(applyCurrent);

  return () => {
    offStorage();
    offSystem();
  };
}

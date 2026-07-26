/**
 * UI theme mode persistence + resolution.
 *
 *   ThemeMode = 'light' | 'dark' | 'system'
 *
 * `system` honors `prefers-color-scheme`. The resolved value is
 * reflected to `document.documentElement.dataset.theme` so the CSS
 * variable palette in `index.css` swaps. A MediaQueryList listener
 * keeps `system` reactive to OS changes during a session.
 */

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'pref.uiTheme';

export function loadThemeMode(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    // ignore
  }
  return 'system';
}

export function saveThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
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

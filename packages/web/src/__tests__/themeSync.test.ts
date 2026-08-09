import { describe, expect, it } from 'vitest';
import {
  installThemeSync,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemeEnvironment,
  type ThemeMode,
} from '../theme.js';

/**
 * Cross-window theme sync.
 *
 * The bug this covers: board and chat windows are real `window.open` popups
 * with their own documents, so `applyTheme` in the main window reached only
 * the main document. Popups took the theme at open time and then went stale —
 * including on an OS light/dark flip, since `watchSystemTheme` was subscribed
 * in MainWindow alone.
 *
 * `installThemeSync` runs once per document from `main.tsx`. These tests drive
 * it through a fake `ThemeEnvironment`, so what is asserted is the
 * subscribe/re-apply contract, not anything a browser computed. What they
 * cannot see: that a real `storage` event fires across windows, and that CSS
 * repaints when `data-theme` changes.
 */

interface Fake {
  env: ThemeEnvironment;
  /** Every value reflected onto the document, oldest first. */
  applied: ResolvedTheme[];
  /** Latest value reflected, or undefined if nothing was. */
  current(): ResolvedTheme | undefined;
  /** Pretend another same-origin window wrote `key`. */
  fireStorage(key: string | null): void;
  /** Pretend the OS flipped light/dark. */
  fireSystemChange(): void;
  /** Change what the store holds, without notifying (as another window would). */
  setMode(mode: ThemeMode): void;
  /** What `system` currently resolves to. */
  setSystemPalette(palette: ResolvedTheme): void;
  storageListeners: number;
  systemListeners: number;
}

function makeFake(initial: ThemeMode = 'system'): Fake {
  let mode = initial;
  let systemPalette: ResolvedTheme = 'dark';
  const storageHandlers = new Set<(key: string | null) => void>();
  const systemHandlers = new Set<() => void>();
  const applied: ResolvedTheme[] = [];

  const fake: Fake = {
    applied,
    current: () => applied[applied.length - 1],
    fireStorage: (key) => storageHandlers.forEach((h) => h(key)),
    fireSystemChange: () => systemHandlers.forEach((h) => h()),
    setMode: (m) => {
      mode = m;
    },
    setSystemPalette: (p) => {
      systemPalette = p;
    },
    get storageListeners() {
      return storageHandlers.size;
    },
    get systemListeners() {
      return systemHandlers.size;
    },
    env: {
      readMode: () => mode,
      resolve: (m) => (m === 'system' ? systemPalette : m),
      reflect: (resolved) => {
        applied.push(resolved);
      },
      onStorage: (handler) => {
        storageHandlers.add(handler);
        return () => storageHandlers.delete(handler);
      },
      onSystemChange: (handler) => {
        systemHandlers.add(handler);
        return () => systemHandlers.delete(handler);
      },
    },
  };
  return fake;
}

describe('installThemeSync', () => {
  it('applies the stored mode immediately, before any event', () => {
    const fake = makeFake('light');
    installThemeSync(fake.env);
    expect(fake.applied).toEqual(['light']);
  });

  it('resolves system through the environment at install time', () => {
    const fake = makeFake('system');
    fake.setSystemPalette('light');
    installThemeSync(fake.env);
    expect(fake.current()).toBe('light');
  });

  it('re-applies when another window changes the theme key', () => {
    const fake = makeFake('dark');
    installThemeSync(fake.env);

    fake.setMode('light');
    fake.fireStorage(THEME_STORAGE_KEY);

    expect(fake.current()).toBe('light');
  });

  it('ignores storage events for other keys', () => {
    const fake = makeFake('dark');
    installThemeSync(fake.env);

    // The app writes plenty of other keys — window positions, login
    // profiles, the seven Options preferences.
    fake.setMode('light');
    fake.fireStorage('pref.pieceSet');
    fake.fireStorage('raptor.window.board.42');

    expect(fake.applied).toEqual(['dark']);
  });

  it('treats a null key as a store clear and re-reads', () => {
    const fake = makeFake('light');
    installThemeSync(fake.env);

    // localStorage.clear() fires one event with key === null; the mode is
    // gone with everything else, so the default is what should show.
    fake.setMode('system');
    fake.setSystemPalette('dark');
    fake.fireStorage(null);

    expect(fake.current()).toBe('dark');
  });

  it('follows an OS flip while the mode is system', () => {
    const fake = makeFake('system');
    fake.setSystemPalette('dark');
    installThemeSync(fake.env);
    expect(fake.current()).toBe('dark');

    fake.setSystemPalette('light');
    fake.fireSystemChange();

    expect(fake.current()).toBe('light');
  });

  it('holds an explicit mode across an OS flip', () => {
    const fake = makeFake('dark');
    fake.setSystemPalette('dark');
    installThemeSync(fake.env);

    fake.setSystemPalette('light');
    fake.fireSystemChange();

    // The listener is unconditional, so this does re-apply — but it must
    // re-apply `dark`, not the OS's new preference.
    expect(fake.current()).toBe('dark');
  });

  it('notices system being selected in another window without a re-subscribe', () => {
    // Why the OS listener is not mode-gated: it is installed once, while the
    // mode is explicit, and must still be live after another window switches
    // the mode to system.
    const fake = makeFake('dark');
    installThemeSync(fake.env);

    fake.setMode('system');
    fake.setSystemPalette('light');
    fake.fireStorage(THEME_STORAGE_KEY);
    expect(fake.current()).toBe('light');

    fake.setSystemPalette('dark');
    fake.fireSystemChange();
    expect(fake.current()).toBe('dark');
  });

  it('subscribes to both sources exactly once and unsubscribes both', () => {
    const fake = makeFake('dark');
    const stop = installThemeSync(fake.env);
    expect(fake.storageListeners).toBe(1);
    expect(fake.systemListeners).toBe(1);

    stop();
    expect(fake.storageListeners).toBe(0);
    expect(fake.systemListeners).toBe(0);

    fake.setMode('light');
    fake.fireStorage(THEME_STORAGE_KEY);
    fake.fireSystemChange();
    expect(fake.applied).toEqual(['dark']);
  });

  it('is idempotent under a repeated event', () => {
    const fake = makeFake('light');
    installThemeSync(fake.env);

    fake.fireStorage(THEME_STORAGE_KEY);
    fake.fireStorage(THEME_STORAGE_KEY);

    expect(fake.applied).toEqual(['light', 'light', 'light']);
    expect(fake.current()).toBe('light');
  });

  it('keeps two documents in step from one write', () => {
    // The shape the popups actually rely on: each window installs its own
    // sync over its own document, and one storage event reaches all of them.
    const store = { mode: 'dark' as ThemeMode };
    const handlers = new Set<(key: string | null) => void>();
    const docs = [[] as ResolvedTheme[], [] as ResolvedTheme[]];

    const envFor = (doc: ResolvedTheme[]): ThemeEnvironment => ({
      readMode: () => store.mode,
      resolve: (m) => (m === 'system' ? 'dark' : m),
      reflect: (r) => doc.push(r),
      onStorage: (h) => {
        handlers.add(h);
        return () => handlers.delete(h);
      },
      onSystemChange: () => () => {},
    });

    docs.forEach((doc) => installThemeSync(envFor(doc)));
    expect(docs.map((d) => d[d.length - 1])).toEqual(['dark', 'dark']);

    store.mode = 'light';
    handlers.forEach((h) => h(THEME_STORAGE_KEY));

    expect(docs.map((d) => d[d.length - 1])).toEqual(['light', 'light']);
  });
});

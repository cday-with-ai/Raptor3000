import { useEffect, useState } from 'react';
import {
  loadPreferences,
  savePreferences,
  type AppPreferences,
} from './preferences.js';

/** Same-window notification channel. A `storage` event fires only in
 *  OTHER windows (the theme-sync lesson) — a window that changes a
 *  preference itself needs this local echo to see its own change. */
const LOCAL_EVENT = 'raptor:prefs-changed';

/**
 * Read preferences and keep them live: `storage` fires in this window
 * when another window saves a change; the local event covers changes
 * made in THIS window (e.g. the chat layout switcher).
 */
export function useLivePreferences(): AppPreferences {
  const [prefs, setPrefs] = useState<AppPreferences>(() => loadPreferences());
  useEffect(() => {
    const reload = () => setPrefs(loadPreferences());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key.startsWith('pref.')) reload();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(LOCAL_EVENT, reload);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(LOCAL_EVENT, reload);
    };
  }, []);
  return prefs;
}

/** Save a preference change from inside a live window: persists it and
 *  echoes locally so the writing window re-renders too. */
export function saveLivePreference<K extends keyof AppPreferences>(
  key: K,
  value: AppPreferences[K],
): void {
  savePreferences({ ...loadPreferences(), [key]: value });
  window.dispatchEvent(new Event(LOCAL_EVENT));
}

/** Board-window layout, remembered PER MODE (Carson: playing wants a
 *  different shape than observing). Falls back to the global prefs so
 *  nothing changes until a bucket is customized. */
export type LayoutBucket = 'playing' | 'observing' | 'examining';

export interface BoardLayoutPrefs {
  panelRatio: number;
  panelOpen: boolean;
  toolbarOpen: boolean;
  engineRatio: number;
  movesExpanded: boolean;
  /** The engine block's own fold, separate from whether the engine is
   *  offered at all. `showEngineAnalysis` lives on the Options page in
   *  the main window — a different room from the board you are looking
   *  at — so this is the one you reach for mid-game (Carson,
   *  2026-08-15: "Engine needs a point arrow down to collapse it and
   *  another to bring it back"). */
  engineOpen: boolean;
}

const RATIO_BOUNDS: Record<string, [number, number]> = {
  panelRatio: [0.1, 0.5],
  engineRatio: [0.15, 0.7],
};

function rawKey(bucket: LayoutBucket, field: keyof BoardLayoutPrefs): string {
  return `pref.layout.${bucket}.${field}`;
}

export function loadBoardLayout(bucket: LayoutBucket): BoardLayoutPrefs {
  const g = loadPreferences();
  const num = (field: 'panelRatio' | 'engineRatio', fallback: number) => {
    const v = parseFloat(localStorage.getItem(rawKey(bucket, field)) ?? '');
    const [lo, hi] = RATIO_BOUNDS[field];
    return Number.isFinite(v) && v >= lo && v <= hi ? v : fallback;
  };
  const bool = (
    field: 'panelOpen' | 'toolbarOpen' | 'movesExpanded' | 'engineOpen',
    fallback: boolean,
  ) => {
    const v = localStorage.getItem(rawKey(bucket, field));
    return v === 'true' ? true : v === 'false' ? false : fallback;
  };
  return {
    panelRatio: num('panelRatio', g.boardPanelRatio),
    panelOpen: bool('panelOpen', g.boardPanelOpen),
    toolbarOpen: bool('toolbarOpen', g.boardToolbarOpen),
    engineRatio: num('engineRatio', g.engineSplitRatio),
    // Playing starts its move list collapsed by default (Carson).
    movesExpanded: bool('movesExpanded', bucket === 'playing' ? false : g.moveListVisible),
    // Open until folded: the engine block has always been visible where
    // it is offered, and a new control should not change what you see
    // before you touch it.
    engineOpen: bool('engineOpen', true),
  };
}

export function saveBoardLayoutField<K extends keyof BoardLayoutPrefs>(
  bucket: LayoutBucket,
  field: K,
  value: BoardLayoutPrefs[K],
): void {
  try {
    localStorage.setItem(rawKey(bucket, field), String(value));
  } catch {
    // best-effort
  }
  window.dispatchEvent(new Event(LOCAL_EVENT));
}

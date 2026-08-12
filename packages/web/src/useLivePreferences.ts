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

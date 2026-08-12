import { useEffect, useState } from 'react';
import { loadPreferences, type AppPreferences } from './preferences.js';

/**
 * Read preferences and keep them live: `storage` fires in this window
 * when the options page (a different window) saves a change, so board
 * and chat popups restyle without a reload.
 */
export function useLivePreferences(): AppPreferences {
  const [prefs, setPrefs] = useState<AppPreferences>(() => loadPreferences());
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key.startsWith('pref.')) setPrefs(loadPreferences());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  return prefs;
}

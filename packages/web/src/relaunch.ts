/**
 * The one-shot "land on the login screen" flag behind Options → Session →
 * Relaunch (Carson, 2026-08-14: "a reconnect option that relaunches the
 * entire app from the login screen").
 *
 * A relaunch is a real page reload — the cleanest teardown a windowed app
 * has — but auto-login would immediately skip the login screen it was
 * asked to land on. This flag suppresses auto-login for exactly one
 * launch without touching the persistent auto-login preference:
 * sessionStorage is per-tab, survives the reload, and dies with the tab.
 */

export const RELAUNCH_KEY = 'raptor.relaunchToLogin';

type FlagStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function sessionStore(): FlagStore | null {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
  } catch {
    return null; // storage disabled: relaunch still reloads, just may auto-login
  }
}

/** Arm the flag; the next hydrateAutoLogin consumes it and shows login. */
export function armRelaunchToLogin(store: FlagStore | null = sessionStore()): void {
  try {
    store?.setItem(RELAUNCH_KEY, 'true');
  } catch {
    // storage unavailable — see sessionStore()
  }
}

/** True exactly once after arming: reading clears it. */
export function consumeRelaunchToLogin(store: FlagStore | null = sessionStore()): boolean {
  try {
    if (store?.getItem(RELAUNCH_KEY) === 'true') {
      store.removeItem(RELAUNCH_KEY);
      return true;
    }
  } catch {
    // storage unavailable — nothing to consume
  }
  return false;
}

/**
 * Popup-side position persistence. Each popup window calls
 * `installPositionTracker(key)` on mount; on unload it writes its final
 * position+size to the same localStorage key that WindowManager reads
 * when (re)opening.
 *
 * This is Decaf's "Remember Last Window Position" behavior
 * (RememberControllerListener / RememberPositionChatFrameListener in
 * `source/decaf/gui/`), adapted to browsers.
 *
 * The shape of the stored record is synced with WindowManager:
 *   { x: number; y: number; width: number; height: number }
 *
 * We also persist on each significant resize (not just unload) so a
 * crashed popup still has a reasonably recent position on record.
 */

const STORAGE_KEY = 'raptor3000.windowPositions.v1';
const WRITE_DEBOUNCE_MS = 400;

interface StoredPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

type PositionMap = Record<string, StoredPosition>;

function loadMap(): PositionMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PositionMap;
  } catch {
    return {};
  }
}

function saveMap(map: PositionMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // quota/disabled — silently skip
  }
}

function snapshot(): StoredPosition {
  return {
    x: window.screenX,
    y: window.screenY,
    width: window.outerWidth,
    height: window.outerHeight,
  };
}

/**
 * Install position tracking for the current popup window. Returns a
 * disposer. Call once on mount with the stable key matching the
 * WindowManager's storageKeyFor() convention (`${kind}` or `${kind}:${id}`).
 */
export function installPositionTracker(key: string): () => void {
  let writeTimer: number | undefined;

  const persistNow = () => {
    const map = loadMap();
    map[key] = snapshot();
    saveMap(map);
  };

  const scheduleWrite = () => {
    if (writeTimer != null) window.clearTimeout(writeTimer);
    writeTimer = window.setTimeout(persistNow, WRITE_DEBOUNCE_MS);
  };

  // Resize fires on drag-to-resize AND reliably; we use it as our pulse.
  window.addEventListener('resize', scheduleWrite);

  // Best-effort: browsers don't dispatch a move event, but pagehide/unload
  // fires when the user closes the window — synchronous final write.
  window.addEventListener('pagehide', persistNow);
  window.addEventListener('beforeunload', persistNow);

  // Also poll at 2s as a backup for pure-move changes (no resize fires).
  const poll = window.setInterval(scheduleWrite, 2000);

  // Initial write so even a briefly-lived window records its launch spot.
  scheduleWrite();

  return () => {
    window.removeEventListener('resize', scheduleWrite);
    window.removeEventListener('pagehide', persistNow);
    window.removeEventListener('beforeunload', persistNow);
    window.clearInterval(poll);
    if (writeTimer != null) window.clearTimeout(writeTimer);
    persistNow();
  };
}

/**
 * Build the storage key for a popup from its window kind + optional id.
 * Must match WindowManager's `storageKeyFor` convention.
 */
export function windowStorageKey(kind: string, id?: string | null): string {
  return id ? `${kind}:${id}` : kind;
}

/**
 * The one declaration of where window positions live and what a stored
 * record looks like.
 *
 * Two modules write to this map and they are not duplicates of each other:
 *
 *   - `WindowManager` polls each popup it opened every 1500ms, which is what
 *     records a window the user moved and then left open.
 *   - `windowPosition.ts` runs *inside* the popup and writes on `pagehide`,
 *     which is what records the final position of a window being closed — the
 *     poll cannot catch that, because by the time it next fires the handle is
 *     `closed`.
 *
 * Each covers the other's gap, so both writers stay. What was duplicated was
 * the *key*, the record shape and the load/save pair, in two files whose
 * comments each said they must match the other. They now match by
 * construction; a change here reaches both sides or neither.
 */

/** Every kind of window the app can open. Half of the storage key. */
export type WindowKind =
  | 'main'
  | 'chat'
  | 'board'
  | 'bugEar'
  | 'preferences';

/** The record `window.open`'s feature string is rebuilt from. */
export interface StoredPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type PositionMap = Record<string, StoredPosition>;

export const POSITION_STORAGE_KEY = 'raptor3000.windowPositions.v1';

/**
 * Build the storage key for a window: `${kind}` for singletons, `${kind}:${id}`
 * for the multi-instance ones (boards, bug ears).
 *
 * A falsy `id` yields the bare kind. That is right for chat and preferences,
 * which have no id, and wrong-but-unreachable for a board: a board popup that
 * somehow loaded without `?id=` would persist under `board` while the manager
 * reads `board:42`. The manager always writes the id, so it cannot happen
 * today — but this is now the single line where it would happen, rather than
 * two lines in two files.
 */
export function windowStorageKey(
  kind: WindowKind,
  id?: string | null,
): string {
  return id ? `${kind}:${id}` : kind;
}

export function loadPositions(): PositionMap {
  try {
    const raw = localStorage.getItem(POSITION_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PositionMap;
  } catch {
    // Absent, corrupt, or storage disabled — all mean "no saved layout",
    // which the callers already handle as the first-open case.
    return {};
  }
}

export function savePositions(map: PositionMap): void {
  try {
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // quota / disabled storage — a forgotten position is not worth a crash
  }
}

/** Read one window's saved record, or undefined if it has none. */
export function loadPosition(key: string): StoredPosition | undefined {
  return loadPositions()[key];
}

/** Write one window's record, leaving every other window's alone. */
export function savePosition(key: string, position: StoredPosition): void {
  const map = loadPositions();
  map[key] = position;
  savePositions(map);
}

/**
 * App-wide preferences — non-credential settings the user can change
 * from the post-login options page on `/`. Kept separate from
 * `loginProfiles.ts` (which holds per-profile FICS creds).
 *
 * Storage is localStorage, flat keys under the `pref.` prefix. Mirrors
 * the shape of Raptor's preferences.properties where sensible.
 */

export type BoardTheme = 'slate' | 'wood' | 'blue';
export type SoundMode = 'on' | 'off';
export type PieceSet = 'classic' | 'alpha' | 'merida';

export interface AppPreferences {
  boardTheme: BoardTheme;
  pieceSet: PieceSet;
  soundMode: SoundMode;
  showEngineAnalysis: boolean;
  autoJoinChannels: string;
  boardCoordinates: boolean;
  flipOnPlayAsBlack: boolean;
  moveListVisible: boolean;
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  boardTheme: 'slate',
  pieceSet: 'classic',
  soundMode: 'on',
  showEngineAnalysis: true,
  autoJoinChannels: '1,4,53',
  boardCoordinates: true,
  flipOnPlayAsBlack: true,
  moveListVisible: true,
};

const PREFIX = 'pref.';

function getRaw(k: string): string | null {
  try {
    return localStorage.getItem(PREFIX + k);
  } catch {
    return null;
  }
}

function setRaw(k: string, v: string): void {
  try {
    localStorage.setItem(PREFIX + k, v);
  } catch {
    // quota / disabled — best-effort
  }
}

function readBool(k: string, fallback: boolean): boolean {
  const v = getRaw(k);
  if (v === 'true') return true;
  if (v === 'false') return false;
  return fallback;
}

function readString<T extends string>(k: string, fallback: T, allowed: readonly T[]): T {
  const v = getRaw(k);
  return v != null && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export function loadPreferences(): AppPreferences {
  return {
    boardTheme: readString('boardTheme', DEFAULT_PREFERENCES.boardTheme, [
      'slate',
      'wood',
      'blue',
    ]),
    pieceSet: readString('pieceSet', DEFAULT_PREFERENCES.pieceSet, [
      'classic',
      'alpha',
      'merida',
    ]),
    soundMode: readString('soundMode', DEFAULT_PREFERENCES.soundMode, ['on', 'off']),
    showEngineAnalysis: readBool(
      'showEngineAnalysis',
      DEFAULT_PREFERENCES.showEngineAnalysis,
    ),
    autoJoinChannels:
      getRaw('autoJoinChannels') ?? DEFAULT_PREFERENCES.autoJoinChannels,
    boardCoordinates: readBool(
      'boardCoordinates',
      DEFAULT_PREFERENCES.boardCoordinates,
    ),
    flipOnPlayAsBlack: readBool(
      'flipOnPlayAsBlack',
      DEFAULT_PREFERENCES.flipOnPlayAsBlack,
    ),
    moveListVisible: readBool(
      'moveListVisible',
      DEFAULT_PREFERENCES.moveListVisible,
    ),
  };
}

export function savePreferences(prefs: AppPreferences): void {
  setRaw('boardTheme', prefs.boardTheme);
  setRaw('pieceSet', prefs.pieceSet);
  setRaw('soundMode', prefs.soundMode);
  setRaw('showEngineAnalysis', String(prefs.showEngineAnalysis));
  setRaw('autoJoinChannels', prefs.autoJoinChannels);
  setRaw('boardCoordinates', String(prefs.boardCoordinates));
  setRaw('flipOnPlayAsBlack', String(prefs.flipOnPlayAsBlack));
  setRaw('moveListVisible', String(prefs.moveListVisible));
}

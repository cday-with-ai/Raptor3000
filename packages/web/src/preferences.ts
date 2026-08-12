/**
 * App-wide preferences — non-credential settings the user can change
 * from the post-login options page on `/`. Kept separate from
 * `loginProfiles.ts` (which holds per-profile FICS creds).
 *
 * Storage is localStorage, flat keys under the `pref.` prefix. Mirrors
 * the shape of Raptor's preferences.properties where sensible.
 */

// Board look is ported from Chess Ascent (Carson's chessascent.app):
// same theme roster, same custom-colors escape hatch, same piece sets.
export type BoardTheme =
  | 'brown'
  | 'blue'
  | 'green'
  | 'purple'
  | 'ic'
  | 'horsey'
  | 'custom';
export type SoundMode = 'on' | 'off';
export type PieceSet = 'alpha' | 'cardinal' | 'cburnett' | 'leipzig' | 'mpchess';

export const BOARD_THEMES: readonly BoardTheme[] = [
  'brown',
  'blue',
  'green',
  'purple',
  'ic',
  'horsey',
  'custom',
];
export const PIECE_SETS: readonly PieceSet[] = [
  'alpha',
  'cardinal',
  'cburnett',
  'leipzig',
  'mpchess',
];

export interface AppPreferences {
  boardTheme: BoardTheme;
  /** Only consulted when boardTheme === 'custom'. */
  customLightSquareColor: string;
  customDarkSquareColor: string;
  pieceSet: PieceSet;
  soundMode: SoundMode;
  showEngineAnalysis: boolean;
  autoJoinChannels: string;
  boardCoordinates: boolean;
  flipOnPlayAsBlack: boolean;
  moveListVisible: boolean;
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  boardTheme: 'brown',
  customLightSquareColor: '#f0d9b5',
  customDarkSquareColor: '#b58863',
  pieceSet: 'cburnett',
  soundMode: 'on',
  showEngineAnalysis: true,
  autoJoinChannels: '1,4,53',
  boardCoordinates: true,
  flipOnPlayAsBlack: true,
  moveListVisible: true,
};

/**
 * Resolve the two square colors for a preference set. Values are Chess
 * Ascent's SettingsStore.boardColors table verbatim — the point of the
 * port is that a board here looks exactly like a board there.
 */
export function boardColors(prefs: AppPreferences): { light: string; dark: string } {
  if (prefs.boardTheme === 'custom') {
    return {
      light: prefs.customLightSquareColor,
      dark: prefs.customDarkSquareColor,
    };
  }
  const themes: Record<Exclude<BoardTheme, 'custom'>, { light: string; dark: string }> = {
    brown: { light: '#f0d9b5', dark: '#b58863' },
    blue: { light: '#dee3e6', dark: '#8ca2ad' },
    green: { light: '#ffffdd', dark: '#86a666' },
    purple: { light: '#e8dff5', dark: '#9b7ebd' },
    ic: { light: '#ececec', dark: '#c1c18e' },
    horsey: { light: '#f0d9b5', dark: '#946f51' },
  };
  return themes[prefs.boardTheme];
}

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

/** A custom square color must be a #rgb/#rrggbb hex or it is ignored. */
function readColor(k: string, fallback: string): string {
  const v = getRaw(k);
  return v != null && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) ? v : fallback;
}

export function loadPreferences(): AppPreferences {
  return {
    // Stored values from the pre-port themes ('slate', 'wood') and piece
    // sets ('classic', 'merida') fail the allowed-list and fall back to
    // the new defaults — that IS the migration.
    boardTheme: readString('boardTheme', DEFAULT_PREFERENCES.boardTheme, BOARD_THEMES),
    customLightSquareColor: readColor(
      'customLightSquareColor',
      DEFAULT_PREFERENCES.customLightSquareColor,
    ),
    customDarkSquareColor: readColor(
      'customDarkSquareColor',
      DEFAULT_PREFERENCES.customDarkSquareColor,
    ),
    pieceSet: readString('pieceSet', DEFAULT_PREFERENCES.pieceSet, PIECE_SETS),
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
  setRaw('customLightSquareColor', prefs.customLightSquareColor);
  setRaw('customDarkSquareColor', prefs.customDarkSquareColor);
  setRaw('pieceSet', prefs.pieceSet);
  setRaw('soundMode', prefs.soundMode);
  setRaw('showEngineAnalysis', String(prefs.showEngineAnalysis));
  setRaw('autoJoinChannels', prefs.autoJoinChannels);
  setRaw('boardCoordinates', String(prefs.boardCoordinates));
  setRaw('flipOnPlayAsBlack', String(prefs.flipOnPlayAsBlack));
  setRaw('moveListVisible', String(prefs.moveListVisible));
}

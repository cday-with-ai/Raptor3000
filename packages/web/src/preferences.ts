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

/**
 * A clock-chip color: `'auto'` follows the stock look (theme variables
 * for the idle chip, the green/red chips for active/low), a hex value
 * overrides it. Stored per state × per channel (background, text).
 */
export type ClockColor = 'auto' | string;

export type ChatLayout = 'plain' | 'tabs' | 'split';
export const CHAT_LAYOUTS: readonly ChatLayout[] = ['plain', 'tabs', 'split'];

export interface AppPreferences {
  boardTheme: BoardTheme;
  /** Only consulted when boardTheme === 'custom'. */
  customLightSquareColor: string;
  customDarkSquareColor: string;
  pieceSet: PieceSet;
  /** Animate incoming moves (the Chess Ascent slide). */
  boardAnimations: boolean;
  clockActiveBg: ClockColor;
  clockActiveText: ClockColor;
  clockLowBg: ClockColor;
  clockLowText: ClockColor;
  clockIdleBg: ClockColor;
  clockIdleText: ClockColor;
  /**
   * Console layout: 'plain' = one stream, no tabs; 'tabs' = classic
   * single pane with a tab bar; 'split' = Decaf style, active tab above
   * a pinned main console. Switchable inline from the chat window.
   */
  chatLayout: ChatLayout;
  /** Split layout: the top (tab) pane's share of the height, 0.15–0.85.
   *  Set by dragging the divider. */
  chatSplitRatio: number;
  /** Board window: the side panel's share of the width, 0.1–0.5.
   *  Set by dragging the divider between board and panel. */
  boardPanelRatio: number;
  /** Engine block's share of the side panel height, 0.15–0.7 — set by
   *  dragging its seam. Fixed height keeps line churn from reflowing. */
  engineSplitRatio: number;
  /** Board window: side panel and toolbar visibility (the triangles). */
  boardPanelOpen: boolean;
  boardToolbarOpen: boolean;
  /** Console (chat window) look: base font, and per-event-type styling. */
  chatFontFamily: string;
  chatFontSize: number;
  /** Per-event-type colors, 'auto' = the stock color for that type. */
  chatColorChannel: ClockColor;
  chatColorChallenge: ClockColor;
  chatColorGameStart: ClockColor;
  chatColorGameEnd: ClockColor;
  chatColorTell: ClockColor;
  chatColorShout: ClockColor;
  chatColorGame: ClockColor;
  chatColorInternal: ClockColor;
  chatColorOutbound: ClockColor;
  soundMode: SoundMode;
  moveSoundSet: 'sfx' | 'piano' | 'futuristic' | 'nes';
  showEngineAnalysis: boolean;
  autoJoinChannels: string;
  /**
   * Base URL of the chessascent channel-log API for chat backfill —
   * scrollback from before login, up to 24h. Empty string disables.
   */
  channelHistoryUrl: string;
  boardCoordinates: boolean;
  flipOnPlayAsBlack: boolean;
  moveListVisible: boolean;
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  boardTheme: 'brown',
  customLightSquareColor: '#f0d9b5',
  customDarkSquareColor: '#b58863',
  pieceSet: 'cburnett',
  boardAnimations: true,
  clockActiveBg: 'auto',
  clockActiveText: 'auto',
  clockLowBg: 'auto',
  clockLowText: 'auto',
  clockIdleBg: 'auto',
  clockIdleText: 'auto',
  chatLayout: 'split',
  chatSplitRatio: 0.6,
  boardPanelRatio: 0.22,
  engineSplitRatio: 0.35,
  boardPanelOpen: true,
  boardToolbarOpen: true,
  chatFontFamily: '"SF Mono", Consolas, monospace',
  chatFontSize: 13,
  chatColorChannel: 'auto',
  chatColorChallenge: 'auto',
  chatColorGameStart: 'auto',
  chatColorGameEnd: 'auto',
  chatColorTell: 'auto',
  chatColorShout: 'auto',
  chatColorGame: 'auto',
  chatColorInternal: 'auto',
  chatColorOutbound: 'auto',
  soundMode: 'on',
  moveSoundSet: 'sfx',
  showEngineAnalysis: true,
  autoJoinChannels: '1,4,53',
  channelHistoryUrl:
    'https://chessascent-app-back-end-861468272048.us-central1.run.app',
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

/** Split ratio: a float within the draggable range, else the default. */
function readRatio(k: string, fallback: number): number {
  const v = parseFloat(getRaw(k) ?? '');
  return Number.isFinite(v) && v >= 0.15 && v <= 0.85 ? v : fallback;
}

/** Engine block ratio: a float within its draggable range, else default. */
function readEngineRatio(k: string, fallback: number): number {
  const v = parseFloat(getRaw(k) ?? '');
  return Number.isFinite(v) && v >= 0.15 && v <= 0.7 ? v : fallback;
}

/** Board panel ratio: a float within its draggable range, else default. */
function readBoardPanelRatio(k: string, fallback: number): number {
  const v = parseFloat(getRaw(k) ?? '');
  return Number.isFinite(v) && v >= 0.1 && v <= 0.5 ? v : fallback;
}

/** Chat font size: an integer 8–24, else the default. */
function readFontSize(k: string, fallback: number): number {
  const v = parseInt(getRaw(k) ?? '', 10);
  return Number.isInteger(v) && v >= 8 && v <= 24 ? v : fallback;
}

/** A clock color is 'auto' or a hex; anything else falls back to 'auto'. */
function readClockColor(k: string): ClockColor {
  const v = getRaw(k);
  if (v === 'auto') return 'auto';
  return v != null && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) ? v : 'auto';
}

/** Clock chip states, in the order the UI lists them. */
export type ClockState = 'active' | 'low' | 'idle';

/** The stock chip looks — what 'auto' resolves to. The idle chip follows
 *  the theme via CSS variables; active/low are dark in both themes (which
 *  is why their auto text is light — see 2026-08-12 clock-contrast fix). */
export const CLOCK_AUTO: Record<ClockState, { bg: string; text: string; border: string }> = {
  active: { bg: '#2a4a2a', text: '#ffffff', border: '#3a6a3a' },
  low: { bg: '#5a2a2a', text: '#ffd9d9', border: '#a04040' },
  idle: { bg: 'var(--bg-sunken)', text: 'inherit', border: 'var(--border-soft)' },
};

/**
 * Resolve the chip colors for a clock in the given state. Custom values
 * override per channel; the border follows the background it sits on
 * (stock border for stock background, a derived tint for a custom one).
 */
export function clockChipColors(
  prefs: AppPreferences,
  ticking: boolean,
  lowTime: boolean,
): { bg: string; text: string; border: string } {
  const state: ClockState = ticking ? (lowTime ? 'low' : 'active') : 'idle';
  const auto = CLOCK_AUTO[state];
  const bgPref = prefs[`clock${cap(state)}Bg` as const];
  const textPref = prefs[`clock${cap(state)}Text` as const];
  const bg = bgPref === 'auto' ? auto.bg : bgPref;
  const text = textPref === 'auto' ? auto.text : textPref;
  const border =
    bgPref === 'auto' ? auto.border : `color-mix(in srgb, ${bg} 65%, #808080)`;
  return { bg, text, border };
}

function cap(s: ClockState): 'Active' | 'Low' | 'Idle' {
  return (s[0].toUpperCase() + s.slice(1)) as 'Active' | 'Low' | 'Idle';
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
    boardAnimations: readBool('boardAnimations', DEFAULT_PREFERENCES.boardAnimations),
    clockActiveBg: readClockColor('clockActiveBg'),
    clockActiveText: readClockColor('clockActiveText'),
    clockLowBg: readClockColor('clockLowBg'),
    clockLowText: readClockColor('clockLowText'),
    clockIdleBg: readClockColor('clockIdleBg'),
    clockIdleText: readClockColor('clockIdleText'),
    chatLayout: readString('chatLayout', DEFAULT_PREFERENCES.chatLayout, CHAT_LAYOUTS),
    chatSplitRatio: readRatio('chatSplitRatio', DEFAULT_PREFERENCES.chatSplitRatio),
    boardPanelRatio: readBoardPanelRatio('boardPanelRatio', DEFAULT_PREFERENCES.boardPanelRatio),
    engineSplitRatio: readEngineRatio('engineSplitRatio', DEFAULT_PREFERENCES.engineSplitRatio),
    boardPanelOpen: readBool('boardPanelOpen', DEFAULT_PREFERENCES.boardPanelOpen),
    boardToolbarOpen: readBool('boardToolbarOpen', DEFAULT_PREFERENCES.boardToolbarOpen),
    chatFontFamily: getRaw('chatFontFamily') ?? DEFAULT_PREFERENCES.chatFontFamily,
    chatFontSize: readFontSize('chatFontSize', DEFAULT_PREFERENCES.chatFontSize),
    chatColorChannel: readClockColor('chatColorChannel'),
    chatColorChallenge: readClockColor('chatColorChallenge'),
    chatColorGameStart: readClockColor('chatColorGameStart'),
    chatColorGameEnd: readClockColor('chatColorGameEnd'),
    chatColorTell: readClockColor('chatColorTell'),
    chatColorShout: readClockColor('chatColorShout'),
    chatColorGame: readClockColor('chatColorGame'),
    chatColorInternal: readClockColor('chatColorInternal'),
    chatColorOutbound: readClockColor('chatColorOutbound'),
    soundMode: readString('soundMode', DEFAULT_PREFERENCES.soundMode, ['on', 'off']),
    moveSoundSet: readString('moveSoundSet', DEFAULT_PREFERENCES.moveSoundSet, ['sfx', 'piano', 'futuristic', 'nes']),
    showEngineAnalysis: readBool(
      'showEngineAnalysis',
      DEFAULT_PREFERENCES.showEngineAnalysis,
    ),
    autoJoinChannels:
      getRaw('autoJoinChannels') ?? DEFAULT_PREFERENCES.autoJoinChannels,
    channelHistoryUrl:
      getRaw('channelHistoryUrl') ?? DEFAULT_PREFERENCES.channelHistoryUrl,
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
  setRaw('boardAnimations', String(prefs.boardAnimations));
  setRaw('clockActiveBg', prefs.clockActiveBg);
  setRaw('clockActiveText', prefs.clockActiveText);
  setRaw('clockLowBg', prefs.clockLowBg);
  setRaw('clockLowText', prefs.clockLowText);
  setRaw('clockIdleBg', prefs.clockIdleBg);
  setRaw('clockIdleText', prefs.clockIdleText);
  setRaw('chatLayout', prefs.chatLayout);
  setRaw('chatSplitRatio', String(prefs.chatSplitRatio));
  setRaw('boardPanelRatio', String(prefs.boardPanelRatio));
  setRaw('engineSplitRatio', String(prefs.engineSplitRatio));
  setRaw('boardPanelOpen', String(prefs.boardPanelOpen));
  setRaw('boardToolbarOpen', String(prefs.boardToolbarOpen));
  setRaw('chatFontFamily', prefs.chatFontFamily);
  setRaw('chatFontSize', String(prefs.chatFontSize));
  setRaw('chatColorChannel', prefs.chatColorChannel);
  setRaw('chatColorChallenge', prefs.chatColorChallenge);
  setRaw('chatColorGameStart', prefs.chatColorGameStart);
  setRaw('chatColorGameEnd', prefs.chatColorGameEnd);
  setRaw('chatColorTell', prefs.chatColorTell);
  setRaw('chatColorShout', prefs.chatColorShout);
  setRaw('chatColorGame', prefs.chatColorGame);
  setRaw('chatColorInternal', prefs.chatColorInternal);
  setRaw('chatColorOutbound', prefs.chatColorOutbound);
  setRaw('soundMode', prefs.soundMode);
  setRaw('moveSoundSet', prefs.moveSoundSet);
  setRaw('showEngineAnalysis', String(prefs.showEngineAnalysis));
  setRaw('autoJoinChannels', prefs.autoJoinChannels);
  setRaw('channelHistoryUrl', prefs.channelHistoryUrl);
  setRaw('boardCoordinates', String(prefs.boardCoordinates));
  setRaw('flipOnPlayAsBlack', String(prefs.flipOnPlayAsBlack));
  setRaw('moveListVisible', String(prefs.moveListVisible));
}

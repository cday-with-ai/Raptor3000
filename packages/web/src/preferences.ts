import { DEFAULT_LOGIN_SCRIPT } from '@raptor3000/shared';
import type { MoveSoundSet } from './sounds.js';
import {
  CLOCK_DESIGNS,
  CLOCK_SETS,
  CLASSIC_CHIPS,
  type ClockSet,
  type ClockTheme,
} from './clockDesigns.js';
import { readDocumentTheme } from './theme.js';
import { APP_ICONS, type AppIcon } from './appIcons.js';
import { BOARD_FRAMES, type BoardFrame } from './boardFrames.js';
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
  | 'walnut'
  | 'maple'
  | 'mat'
  | 'rosewood'
  | 'custom';
export type SoundMode = 'on' | 'off';

/**
 * Auto-promote (Carson, 2026-08-15: "auto promote should be checkboxes
 * with pieces. we did this in raptor. It bypasses the popup if selected.
 * Default is on queen.").
 *
 * The armed piece, or `'off'` for the promotion picker. Checkbox LOOK,
 * radio BEHAVIOUR — the original Raptor's control, and Raptor is the
 * authority where the two differ (README). `'off'` is what unchecking
 * the armed box leaves behind, and it is the only way back to the
 * picker, which is why unchecking has to be allowed at all: four boxes
 * that can never all be clear would be a radio group wearing a costume.
 */
export type AutoPromote = 'off' | 'Q' | 'R' | 'B' | 'N';
/** The pieces, in the order the checkboxes are drawn. */
export const AUTO_PROMOTE_PIECES = ['Q', 'R', 'B', 'N'] as const;
export const AUTO_PROMOTE_VALUES: readonly AutoPromote[] = [
  'off',
  ...AUTO_PROMOTE_PIECES,
];
export type PieceSet =
  | 'alpha'
  | 'asog'
  | 'cardinal'
  | 'cburnett'
  | 'jrti'
  | 'leipzig'
  | 'mpchess'
  | 'ocisly'
  | 'subtlety'
  | 'talon'
  | 'vlgi';

export const BOARD_THEMES: readonly BoardTheme[] = [
  'brown',
  'blue',
  'green',
  'purple',
  'ic',
  'horsey',
  'walnut',
  'maple',
  'mat',
  'rosewood',
  'custom',
];
export const PIECE_SETS: readonly PieceSet[] = [
  'alpha',
  'asog',
  'cardinal',
  'cburnett',
  'jrti',
  'leipzig',
  'mpchess',
  'ocisly',
  'subtlety',
  'talon',
  'vlgi',
];

/**
 * A clock-chip color: `'auto'` follows the stock look (theme variables
 * for the idle chip, the green/red chips for active/low), a hex value
 * overrides it. Stored per state × per channel (background, text).
 */
export type ClockColor = 'auto' | string;

/**
 * `seek` joined the three console layouts on 2026-08-15 (Carson: "seek
 * graph should move into the tabs area as an option next to (plain,
 * tabs, split)"). It is a layout rather than a tab because it is a
 * whole-pane view like the others — and because the chat window is
 * where you are when you go looking for a game, not the settings page
 * it used to live on.
 *
 * Later the same day it stopped being one list. Five things sat in a
 * row where only three answered the same question, so they split
 * (Carson: "chat type (single) (tabs) (split), line one below (seeks)
 * (actions)"). The **types** say how the console is drawn; the
 * **views** replace it with something that is not a console at all.
 * Both still live in this one preference, because only one of the five
 * can be on screen at a time — the split is in the control, not the
 * state. `plain` was renamed `single` in the same move: it is one
 * stream, and "single" says that where "plain" only said "not fancy".
 */
/** How the console is drawn — the top row of the switcher. */
export const CHAT_TYPES = ['single', 'tabs', 'split'] as const;
/** What replaces the console — the row below it. */
export const CHAT_VIEWS = ['seeks', 'actions'] as const;
export const CHAT_LAYOUTS = [...CHAT_TYPES, ...CHAT_VIEWS] as const;
/**
 * Derived from the two rows rather than declared alongside them, so a
 * layout cannot exist as a type and be missing from a row. `ChatWindow`
 * decides what a mode *is* by asking whether `CHAT_TYPES` contains it —
 * a mode absent from both rows would compile, render as a view, and
 * then refuse to be the console to come back to. Deriving makes that
 * unspellable instead of merely untested.
 */
export type ChatLayout = (typeof CHAT_LAYOUTS)[number];

/**
 * The two layouts that were renamed rather than removed. The house rule
 * is that an unknown stored value falls back to the default (see
 * `loadPreferences`) — correct for a dropped option, wrong for a
 * renamed one, which would silently move a `plain` user to `split`.
 */
const RENAMED_LAYOUTS: Readonly<Record<string, ChatLayout>> = {
  plain: 'single',
  seek: 'seeks',
};

const RENAMED_PIECE_SETS: Readonly<Record<string, PieceSet>> = {
  spire: 'asog',
  grokton: 'asog',
  club: 'ocisly',
  match: 'jrti',
};

export interface AppPreferences {
  boardTheme: BoardTheme;
  /** Only consulted when boardTheme === 'custom'. */
  customLightSquareColor: string;
  customDarkSquareColor: string;
  /** Rail around the 8×8. Shadow is the original Chess Ascent chrome. */
  boardFrame: BoardFrame;
  pieceSet: PieceSet;
  /** Animate incoming moves (the Chess Ascent slide). */
  boardAnimations: boolean;
  clockSet: ClockSet;
  appIcon: AppIcon;
  clockActiveBg: ClockColor;
  clockActiveText: ClockColor;
  clockLowBg: ClockColor;
  clockLowText: ClockColor;
  clockIdleBg: ClockColor;
  clockIdleText: ClockColor;
  /**
   * Console layout: 'single' = one stream, no tabs; 'tabs' = classic
   * single pane with a tab bar; 'split' = Decaf style, active tab above
   * a pinned main console. 'seeks' and 'actions' are not console types
   * at all — they put the seek graph or the actions pane in the log's
   * place. Switchable inline from the chat window.
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
  moveSoundSet: MoveSoundSet;
  /** Synthesized alerts for tells / friend arrivals / departures —
   *  gated under the master soundMode, styled by moveSoundSet. */
  alertSounds: SoundMode;
  keepAlive: SoundMode; // 'on' | 'off' — reuse the two-state type
  keepAliveCommand: string;
  loginScript: string; // one command per line
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
  /**
   * The piece a promotion plays without asking, or `'off'` to be asked.
   * See `AutoPromote` — the default is a queen, so out of the box a
   * promotion never opens a dialog.
   */
  autoPromote: AutoPromote;
  /**
   * Auto-append every game you PLAY to a designated PGN collection file
   * (Carson, 2026-08-16). The file is chosen once in Options — the only
   * place with a user gesture — and its handle lives in IndexedDB.
   * Games you only watch or examine never reach it.
   */
  autoAppendPgn: boolean;
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  boardTheme: 'brown',
  customLightSquareColor: '#f0d9b5',
  customDarkSquareColor: '#b58863',
  boardFrame: 'chronos',
  pieceSet: 'cburnett',
  boardAnimations: true,
  clockSet: 'alpha',
  appIcon: 'industrial',
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
  alertSounds: 'on',
  moveSoundSet: 'felt',
  // ON by default since 2026-08-15. FICS logs out an idle session after
  // 60 minutes, and watching a channel does not count as activity — so a
  // lurker's client that ships this off dies on the hour, every hour,
  // and says nothing. Preferences are per-origin localStorage, which is
  // why flipping it on localhost never helped raptor3000.pages.dev: that
  // origin had never had the toggle turned on at all. One hidden `date`
  // every 20 minutes is a rounding error against a chat stream.
  keepAlive: 'on',
  keepAliveCommand: 'date',
  loginScript: DEFAULT_LOGIN_SCRIPT.join('\n'),
  showEngineAnalysis: true,
  autoJoinChannels: '1,4,53',
  channelHistoryUrl:
    'https://chessascent-app-back-end-861468272048.us-central1.run.app',
  boardCoordinates: true,
  flipOnPlayAsBlack: true,
  // Queen, per Carson — a promotion plays one with no dialog until you
  // say otherwise.
  autoPromote: 'Q',
  moveListVisible: true,
  autoAppendPgn: false,
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
    walnut: { light: '#e4c9a0', dark: '#7a4a28' },
    maple: { light: '#f3e2c4', dark: '#c49a62' },
    mat: { light: '#efe4c4', dark: '#4a7a4e' },
    rosewood: { light: '#e8c8b0', dark: '#6a3228' },
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

/** The stock chip looks — Classic's dark tokens, what 'auto' resolved
 *  to before there were designs. The idle chip follows the theme via
 *  CSS variables; active/low are dark in both themes (which is why
 *  their auto text is light — see 2026-08-12 clock-contrast fix). */
export const CLOCK_AUTO = CLASSIC_CHIPS;

/**
 * Resolve the chip colors for a clock in the given state. The selected
 * design supplies the auto look (per theme); custom values override per
 * channel. The border follows the background it sits on (stock border
 * for stock background, a derived tint for a custom one).
 */
export function clockChipColors(
  prefs: AppPreferences,
  ticking: boolean,
  lowTime: boolean,
  theme: ClockTheme = readDocumentTheme(),
): { bg: string; text: string; border: string; glow?: string } {
  const state: ClockState = ticking ? (lowTime ? 'low' : 'active') : 'idle';
  const design = CLOCK_DESIGNS[prefs.clockSet] ?? CLOCK_DESIGNS.classic;
  const auto = design.chip[theme][state];
  const bgPref = prefs[`clock${cap(state)}Bg` as const];
  const textPref = prefs[`clock${cap(state)}Text` as const];
  const bg = bgPref === 'auto' ? auto.bg : bgPref;
  const text = textPref === 'auto' ? auto.text : textPref;
  const border =
    bgPref === 'auto' ? auto.border : `color-mix(in srgb, ${bg} 65%, #808080)`;
  const glow = bgPref === 'auto' ? auto.glow : undefined;
  return glow ? { bg, text, border, glow } : { bg, text, border };
}

function cap(s: ClockState): 'Active' | 'Low' | 'Idle' {
  return (s[0].toUpperCase() + s.slice(1)) as 'Active' | 'Low' | 'Idle';
}

/** The stored layout, carrying the two renames across (plain → single,
 *  seek → seeks) before the allowed-list check that would otherwise
 *  drop them back to the default. */
function readChatLayout(): ChatLayout {
  const raw = getRaw('chatLayout');
  const renamed = raw != null ? RENAMED_LAYOUTS[raw] : undefined;
  if (renamed) return renamed;
  return readString('chatLayout', DEFAULT_PREFERENCES.chatLayout, CHAT_LAYOUTS);
}

function readPieceSet(): PieceSet {
  const raw = getRaw('pieceSet');
  const renamed = raw != null ? RENAMED_PIECE_SETS[raw] : undefined;
  if (renamed) return renamed;
  return readString('pieceSet', DEFAULT_PREFERENCES.pieceSet, PIECE_SETS);
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
    boardFrame: readString('boardFrame', DEFAULT_PREFERENCES.boardFrame, BOARD_FRAMES),
    pieceSet: readPieceSet(),
    boardAnimations: readBool('boardAnimations', DEFAULT_PREFERENCES.boardAnimations),
    clockSet: readString('clockSet', DEFAULT_PREFERENCES.clockSet, CLOCK_SETS),
    appIcon: readString('appIcon', DEFAULT_PREFERENCES.appIcon, APP_ICONS),
    clockActiveBg: readClockColor('clockActiveBg'),
    clockActiveText: readClockColor('clockActiveText'),
    clockLowBg: readClockColor('clockLowBg'),
    clockLowText: readClockColor('clockLowText'),
    clockIdleBg: readClockColor('clockIdleBg'),
    clockIdleText: readClockColor('clockIdleText'),
    chatLayout: readChatLayout(),
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
    alertSounds: readString('alertSounds', DEFAULT_PREFERENCES.alertSounds, ['on', 'off']),
    moveSoundSet: readString('moveSoundSet', DEFAULT_PREFERENCES.moveSoundSet, [
      'felt',
      'walnut',
      'marble',
      'clock',
      'study',
      'slate',
      'sfx',
      'piano',
      'futuristic',
      'nes',
    ]),
    keepAlive: readString('keepAlive', DEFAULT_PREFERENCES.keepAlive, ['on', 'off']),
    keepAliveCommand: getRaw('keepAliveCommand') ?? DEFAULT_PREFERENCES.keepAliveCommand,
    loginScript: getRaw('loginScript') ?? DEFAULT_PREFERENCES.loginScript,
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
    autoPromote: readString(
      'autoPromote',
      DEFAULT_PREFERENCES.autoPromote,
      AUTO_PROMOTE_VALUES,
    ),
    autoAppendPgn: readBool(
      'autoAppendPgn',
      DEFAULT_PREFERENCES.autoAppendPgn,
    ),
  };
}

export function savePreferences(prefs: AppPreferences): void {
  setRaw('boardTheme', prefs.boardTheme);
  setRaw('customLightSquareColor', prefs.customLightSquareColor);
  setRaw('customDarkSquareColor', prefs.customDarkSquareColor);
  setRaw('boardFrame', prefs.boardFrame);
  setRaw('pieceSet', prefs.pieceSet);
  setRaw('boardAnimations', String(prefs.boardAnimations));
  setRaw('clockSet', prefs.clockSet);
  setRaw('appIcon', prefs.appIcon);
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
  setRaw('alertSounds', prefs.alertSounds);
  setRaw('moveSoundSet', prefs.moveSoundSet);
  setRaw('keepAlive', prefs.keepAlive);
  setRaw('keepAliveCommand', prefs.keepAliveCommand);
  setRaw('loginScript', prefs.loginScript);
  setRaw('showEngineAnalysis', String(prefs.showEngineAnalysis));
  setRaw('autoJoinChannels', prefs.autoJoinChannels);
  setRaw('channelHistoryUrl', prefs.channelHistoryUrl);
  setRaw('boardCoordinates', String(prefs.boardCoordinates));
  setRaw('flipOnPlayAsBlack', String(prefs.flipOnPlayAsBlack));
  setRaw('moveListVisible', String(prefs.moveListVisible));
  setRaw('autoPromote', prefs.autoPromote);
  setRaw('autoAppendPgn', String(prefs.autoAppendPgn));
}

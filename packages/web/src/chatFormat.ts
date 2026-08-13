import { ChatEventType, decodeMaciej, type ChatEvent } from '@raptor3000/shared';
import type { AppPreferences, ClockColor } from './preferences.js';

/**
 * Pure text/color logic for the chat window, split out of the component
 * so it can be tested without a DOM.
 *
 * - Maciejg entities decode at display time (`&#8230;` → …) — storage
 *   and the wire keep the encoded form.
 * - Your own channel sends render like everyone else's line:
 *   `cday(39): hi`, not `> tell 39 hi` (Carson, 2026-08-12).
 * - Per-type colors are preferences; 'auto' is the stock palette.
 */

export type ChatColorKey =
  | 'channel'
  | 'tell'
  | 'shout'
  | 'game'
  | 'challenge'
  | 'gameStart'
  | 'gameEnd'
  | 'internal'
  | 'outbound';

/** Stock per-type colors — what 'auto' resolves to. */
export const CHAT_COLOR_AUTO: Record<ChatColorKey, string> = {
  channel: 'var(--chat-channel)',
  tell: 'var(--chat-tell)',
  shout: 'var(--chat-shout)',
  game: 'var(--chat-game)',
  challenge: 'var(--chat-challenge)',
  gameStart: 'var(--chat-game-start)',
  gameEnd: 'var(--chat-game-end)',
  internal: 'var(--chat-internal)',
  outbound: 'var(--accent)',
};

export function chatColorKeyFor(type: ChatEventType): ChatColorKey | null {
  switch (type) {
    case ChatEventType.CHANNEL_TELL:
      return 'channel';
    case ChatEventType.TELL:
    case ChatEventType.TOLD:
    case ChatEventType.PARTNER_TELL:
      return 'tell';
    case ChatEventType.SHOUT:
    case ChatEventType.CSHOUT:
      return 'shout';
    case ChatEventType.KIBITZ:
    case ChatEventType.WHISPER:
      return 'game';
    case ChatEventType.CHALLENGE:
      return 'challenge';
    case ChatEventType.INTERNAL:
      return 'internal';
    case ChatEventType.OUTBOUND:
      return 'outbound';
    default:
      return null;
  }
}

const PREF_KEY: Record<ChatColorKey, keyof AppPreferences> = {
  challenge: 'chatColorChallenge',
  gameStart: 'chatColorGameStart',
  gameEnd: 'chatColorGameEnd',
  channel: 'chatColorChannel',
  tell: 'chatColorTell',
  shout: 'chatColorShout',
  game: 'chatColorGame',
  internal: 'chatColorInternal',
  outbound: 'chatColorOutbound',
};

/** Resolve the display color for an event under the given preferences. */
export function chatColorFor(e: ChatEvent, prefs: AppPreferences): string {
  const key =
    chatColorKeyFor(e.type) ??
    (e.type === ChatEventType.UNKNOWN ? gameLineKind(e.message) : null);
  if (!key) return 'var(--fg)';
  const pref = prefs[PREF_KEY[key]] as ClockColor;
  return pref === 'auto' ? CHAT_COLOR_AUTO[key] : pref;
}

// Game start/end lines have no ChatEventType of their own (the enum is
// Raptor-parity), so they're classified at DISPLAY time from the text:
// `{Game 15 (A vs. B) Creating unrated blitz match.}` starts one,
// `{Game 15 (A vs. B) B checkmated} 0-1` ends one. End wins when a
// chunk carries both.
const GAME_END_LINE = /^\{Game \d+ \([^)]*\) [^}]*\}\s*(?:1-0|0-1|1\/2-1\/2|\*)/m;
const GAME_START_LINE = /^\{Game \d+ \([^)]*\) (?:Creating|Continuing)/m;

/** 'gameStart' | 'gameEnd' | null for a console line's text. */
export function gameLineKind(message: string): 'gameStart' | 'gameEnd' | null {
  if (GAME_END_LINE.test(message)) return 'gameEnd';
  if (GAME_START_LINE.test(message)) return 'gameStart';
  return null;
}

/**
 * An outbound tell in ANY form FICS accepts — Carson's 2026-08-13 bug:
 * he typed a shorthand tell to 39 and it rendered in main as a raw
 * `>` echo, because only the literal `tell ` prefix was recognized.
 * FICS resolves t/te/tel as tell, and xtell is tell-without-retarget.
 */
const OUTBOUND_TELL_RE = /^(?:t|te|tel|tell|xtell)\s+(\S+)\s+([\s\S]+)$/i;

/** {target, body} for any outbound tell form, else null. */
export function outboundTell(message: string): { target: string; body: string } | null {
  const m = OUTBOUND_TELL_RE.exec(message);
  return m ? { target: m[1], body: m[2] } : null;
}

/**
 * The display text for an event (no timestamp prefix). `ownHandle` makes
 * your channel sends render as `cday(39): hi`.
 */
export function lineBody(e: ChatEvent, ownHandle: string | null): string {
  switch (e.type) {
    case ChatEventType.INTERNAL:
      return `· ${e.message}`;
    case ChatEventType.OUTBOUND: {
      const t = outboundTell(e.message);
      if (t && ownHandle && /^\d+$/.test(t.target)) {
        return `${ownHandle}(${t.target}): ${decode(t.body)}`;
      }
      return `> ${decode(e.message)}`;
    }
    case ChatEventType.TELL:
      return `${e.source ?? '?'} tells you: ${decode(e.message)}`;
    case ChatEventType.TOLD:
      return `(told ${e.source ?? '?'}): ${decode(e.message)}`;
    case ChatEventType.CHANNEL_TELL:
      return `${e.source ?? '?'}(${e.channel ?? '?'}): ${decode(e.message)}`;
    case ChatEventType.SHOUT:
      return `${e.source ?? '?'} shouts: ${decode(e.message)}`;
    case ChatEventType.CSHOUT:
      return `${e.source ?? '?'} c-shouts: ${decode(e.message)}`;
    case ChatEventType.KIBITZ:
      return `${e.source ?? '?'}[${e.gameId ?? '?'}] kibitzes: ${decode(e.message)}`;
    case ChatEventType.WHISPER:
      return `${e.source ?? '?'}[${e.gameId ?? '?'}] whispers: ${decode(e.message)}`;
    case ChatEventType.PARTNER_TELL:
      return `partner tells you: ${decode(e.message)}`;
    case ChatEventType.NOTIFICATION_ARRIVAL:
      return `+ ${e.source ?? '?'} has arrived.`;
    case ChatEventType.NOTIFICATION_DEPARTURE:
      return `- ${e.source ?? '?'} has departed.`;
    case ChatEventType.UNKNOWN:
      return decode(e.raw);
    default:
      return `[${e.type}] ${decode(e.message || e.raw)}`;
  }
}

function decode(text: string): string {
  return decodeMaciej(text);
}

/**
 * A `games` command output row — `  22 2036 pikozrout   1638 walpurti  [...]`
 * — or a `history`/`journal` row. These arrive as UNKNOWN text; matching
 * them at display time makes the row a click target (observe / examine).
 */
export interface RowAction {
  /** Command to send when the row is clicked. */
  command: string;
  /** Human label for the hover title. */
  label: string;
}

const GAMES_ROW_RE = /^\s{0,3}(\d{1,4})\s+(?:\d{1,4}|\+{4})\s+\S+\s+(?:\d{1,4}|\+{4})\s+\S+\s+\[/;
// `GuestLTND (++++) seeking 15 0 unrated standard ("play 38" to respond)`
const SEEK_ROW_RE = /\("play (\d+)" to respond\)/;
// `sought` table rows (Carson, 2026-08-12 — the announcement form above
// linked, the table didn't):
// `  9 ++++ guestHELL     7   0 unrated blitz      0-9999 f`
// ` 14 ++++ GuestFDXH    15   0 unrated standard   [black] 0-9999`
// Shape-matched end to end (index, rating, name, time, inc, ratedness,
// type, optional color, range) so bare numbered chat lines can't link.
const SOUGHT_ROW_RE =
  /^\s{0,3}(\d{1,4})\s+(?:\+{4}|-{4}|\d{1,4}[PE]?)\s+\S+\s+\d{1,3}\s+\d{1,3}\s+(?:un)?rated\s+\S+(?:\s+\[(?:white|black)\])?\s+\d{1,4}-\d{1,4}/;
// `  1: - 22 W  1291 CDay        [ br  5  12] B23 Res Aug 12, 2026`
const HISTORY_ROW_RE = /^\s{0,3}(\d{1,3}):\s+[+=-]\s+\d+\s+[WB]\s+\d+\s+(\S+)/;
// `  %01: + 33 W 1291 CDay ...` — journal slots are %NN
const JOURNAL_ROW_RE = /^\s{0,3}%(\d{2}):/;

/**
 * If this display line is an actionable server-list row, the click
 * action for it. `listOwner` is the player whose history/journal was
 * requested (needed to build the examine command); null means unknown,
 * which disables history/journal actions but not games rows.
 */
export function rowAction(line: string, listOwner: string | null): RowAction | null {
  const seek = SEEK_ROW_RE.exec(line);
  if (seek) {
    return { command: `play ${seek[1]}`, label: `accept seek ${seek[1]}` };
  }
  const sought = SOUGHT_ROW_RE.exec(line);
  if (sought) {
    return { command: `play ${sought[1]}`, label: `accept ad ${sought[1]}` };
  }
  const games = GAMES_ROW_RE.exec(line);
  if (games) {
    return { command: `observe ${games[1]}`, label: `observe game ${games[1]}` };
  }
  const hist = HISTORY_ROW_RE.exec(line);
  if (hist && listOwner) {
    return {
      command: `examine ${listOwner} ${hist[1]}`,
      label: `examine ${listOwner}'s game ${hist[1]}`,
    };
  }
  const jour = JOURNAL_ROW_RE.exec(line);
  if (jour && listOwner) {
    return {
      command: `examine ${listOwner} %${jour[1]}`,
      label: `examine ${listOwner}'s journal %${jour[1]}`,
    };
  }
  return null;
}

/**
 * Who a history/journal listing belongs to, read from its header line:
 * `History for GuestXYZW:` / `Journal for cday:`.
 */
export function listOwnerFrom(line: string): string | null {
  const m = /^(?:History|Journal) for (\w+):/m.exec(line);
  return m ? m[1] : null;
}

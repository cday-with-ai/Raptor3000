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
  | 'internal'
  | 'outbound';

/** Stock per-type colors — what 'auto' resolves to. */
export const CHAT_COLOR_AUTO: Record<ChatColorKey, string> = {
  channel: '#c9b070',
  tell: '#8fe08f',
  shout: '#b8a3e0',
  game: '#9fc4e0',
  internal: '#888888',
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
    case ChatEventType.INTERNAL:
      return 'internal';
    case ChatEventType.OUTBOUND:
      return 'outbound';
    default:
      return null;
  }
}

const PREF_KEY: Record<ChatColorKey, keyof AppPreferences> = {
  channel: 'chatColorChannel',
  tell: 'chatColorTell',
  shout: 'chatColorShout',
  game: 'chatColorGame',
  internal: 'chatColorInternal',
  outbound: 'chatColorOutbound',
};

/** Resolve the display color for an event under the given preferences. */
export function chatColorFor(e: ChatEvent, prefs: AppPreferences): string {
  const key = chatColorKeyFor(e.type);
  if (!key) return 'var(--fg)';
  const pref = prefs[PREF_KEY[key]] as ClockColor;
  return pref === 'auto' ? CHAT_COLOR_AUTO[key] : pref;
}

/** An outbound channel tell, if this outbound line is one. */
const OUTBOUND_CHANNEL_RE = /^tell\s+(\d+)\s+([\s\S]+)$/i;

/**
 * The display text for an event (no timestamp prefix). `ownHandle` makes
 * your channel sends render as `cday(39): hi`.
 */
export function lineBody(e: ChatEvent, ownHandle: string | null): string {
  switch (e.type) {
    case ChatEventType.INTERNAL:
      return `· ${e.message}`;
    case ChatEventType.OUTBOUND: {
      const m = OUTBOUND_CHANNEL_RE.exec(e.message);
      if (m && ownHandle) return `${ownHandle}(${m[1]}): ${decode(m[2])}`;
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

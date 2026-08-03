import { ChatEventType } from '../../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../../events/ChatEvent.js';
import { startsWithOrOffset1 } from '../../services/IcsUtils.js';
import type { ChatEventParser } from '../ChatEventParser.js';

/**
 * `history` command response. Parity with HistoryEventParser.java.
 * Note: Raptor does NOT stripTitles on the username here (bug or by design).
 *
 *   History for GuestABCD:
 *   ...
 */
export class HistoryEventParser implements ChatEventParser {
  readonly name = 'HistoryEventParser';
  private static readonly PREFIX = 'History for ';

  parse(line: string): ChatEvent | null {
    const text = line.trim();
    if (!startsWithOrOffset1(text, HistoryEventParser.PREFIX)) return null;
    const offset = text.startsWith(HistoryEventParser.PREFIX)
      ? HistoryEventParser.PREFIX.length
      : HistoryEventParser.PREFIX.length + 1;
    const after = text.substring(offset);
    const m = /^([A-Za-z0-9_()*]+)/.exec(after);
    if (!m) return null;
    return makeChatEvent(ChatEventType.HISTORY, text, {
      source: m[1],
      message: text,
    });
  }
}

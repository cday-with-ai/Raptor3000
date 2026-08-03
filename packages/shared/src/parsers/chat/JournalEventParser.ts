import { ChatEventType } from '../../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../../events/ChatEvent.js';
import { startsWithOrOffset1 } from '../../services/IcsUtils.js';
import type { ChatEventParser } from '../ChatEventParser.js';

/**
 * `journal` command response. Parity with JournalEventParser.java.
 * NO stripTitles on username (matches Raptor).
 */
export class JournalEventParser implements ChatEventParser {
  readonly name = 'JournalEventParser';
  private static readonly PREFIX = 'Journal for ';

  parse(line: string): ChatEvent | null {
    const text = line.trim();
    if (!startsWithOrOffset1(text, JournalEventParser.PREFIX)) return null;
    const offset = text.startsWith(JournalEventParser.PREFIX)
      ? JournalEventParser.PREFIX.length
      : JournalEventParser.PREFIX.length + 1;
    const after = text.substring(offset);
    const m = /^([A-Za-z0-9_()*]+)/.exec(after);
    if (!m) return null;
    return makeChatEvent(ChatEventType.JOURNAL, text, {
      source: m[1],
      message: text,
    });
  }
}

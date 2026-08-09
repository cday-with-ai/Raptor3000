import { ChatEventType } from '../../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../../events/ChatEvent.js';
import { offsetAfterPrefix } from '../../services/IcsUtils.js';
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
    const offset = offsetAfterPrefix(text, JournalEventParser.PREFIX);
    if (offset < 0) return null;
    const after = text.substring(offset);
    const m = /^([A-Za-z0-9_()*]+)/.exec(after);
    if (!m) return null;
    return makeChatEvent(ChatEventType.JOURNAL, text, {
      source: m[1],
      message: text,
    });
  }
}

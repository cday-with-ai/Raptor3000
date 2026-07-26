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
    if (!startsWithOrOffset1(line, JournalEventParser.PREFIX)) return null;
    const offset = line.startsWith(JournalEventParser.PREFIX)
      ? JournalEventParser.PREFIX.length
      : JournalEventParser.PREFIX.length + 1;
    const after = line.substring(offset);
    const m = /^([A-Za-z0-9_()*]+)/.exec(after);
    if (!m) return null;
    return makeChatEvent(ChatEventType.JOURNAL, line, {
      source: m[1],
      message: line,
    });
  }
}

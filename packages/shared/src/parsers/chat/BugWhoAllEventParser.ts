import { ChatEventType } from '../../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../../events/ChatEvent.js';
import { startsWithAt } from '../../services/IcsUtils.js';
import type { ChatEventParser } from '../ChatEventParser.js';

/**
 * `bugwho` full output. Parity with BugWhoAllEventParser.java.
 *
 * Matches the whole bugwho block: starts with "Bughouse games in progress"
 * and ends with ". (*) indicates system administrator.".
 */
export class BugWhoAllEventParser implements ChatEventParser {
  readonly name = 'BugWhoAllEventParser';
  private static readonly START = 'Bughouse games in progress';
  private static readonly END = '. (*) indicates system administrator.';

  parse(line: string): ChatEvent | null {
    const text = line.trim();
    const startsAt0 = text.startsWith(BugWhoAllEventParser.START);
    const startsAt1 = startsWithAt(text, BugWhoAllEventParser.START, 1);
    const endsWithTerminator = text.endsWith(BugWhoAllEventParser.END);
    if ((startsAt0 && endsWithTerminator) || startsAt1) {
      return makeChatEvent(ChatEventType.BUGWHO_ALL, text, { message: text });
    }
    return null;
  }
}

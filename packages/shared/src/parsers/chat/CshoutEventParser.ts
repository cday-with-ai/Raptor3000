import { ChatEventType } from '../../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../../events/ChatEvent.js';
import { stripTitles } from '../../services/IcsUtils.js';
import type { ChatEventParser } from '../ChatEventParser.js';

/**
 * c-shout. Parity with CShoutEventParser.java.
 *   GuestABCD c-shouts: anyone want to play?
 */
export class CshoutEventParser implements ChatEventParser {
  readonly name = 'CshoutEventParser';

  parse(line: string): ChatEvent | null {
    const tokens = line.split(/\s+/);
    if (tokens.length < 2) return null;
    if (tokens[1] !== 'c-shouts:') return null;
    return makeChatEvent(ChatEventType.CSHOUT, line, {
      source: stripTitles(tokens[0]),
      message: line.trim(),
    });
  }
}

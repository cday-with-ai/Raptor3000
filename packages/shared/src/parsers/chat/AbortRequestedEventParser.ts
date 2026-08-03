import { ChatEventType } from '../../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../../events/ChatEvent.js';
import type { ChatEventParser } from '../ChatEventParser.js';

/**
 * Abort request. Parity with AbortRequestedEventParser.java.
 *   GuestABCD would like to abort the game; type "abort" to accept.
 */
export class AbortRequestedEventParser implements ChatEventParser {
  readonly name = 'AbortRequestedEventParser';
  private static readonly IDENT =
    'would like to abort the game; type "abort" to accept.';

  parse(line: string): ChatEvent | null {
    if (line.length >= 600) return null;
    const text = line.trim();
    if (!text.includes(AbortRequestedEventParser.IDENT)) return null;
    return makeChatEvent(ChatEventType.ABORT_REQUEST, text, {
      message: text,
    });
  }
}

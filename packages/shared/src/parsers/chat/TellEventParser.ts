import { ChatEventType } from '../../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../../events/ChatEvent.js';
import type { ChatEventParser } from '../ChatEventParser.js';

/**
 * Personal tell.
 *   GuestABCD tells you: hi there
 *   GuestABCD(*)(SR)(GM) tells you: hello      (titles in parens)
 */
export class TellEventParser implements ChatEventParser {
  readonly name = 'TellEventParser';

  // 1=username (handle only), 2=message
  private static readonly RE =
    /^([A-Za-z]{3,17})(?:\([A-Z*]+\))* tells you:\s?(.*)$/;

  parse(line: string): ChatEvent | null {
    const text = line.trim();
    const m = TellEventParser.RE.exec(text);
    if (!m) return null;
    return makeChatEvent(ChatEventType.TELL, text, {
      source: m[1],
      message: m[2],
    });
  }
}

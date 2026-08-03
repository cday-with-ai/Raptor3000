import { ChatEventType } from '../../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../../events/ChatEvent.js';
import type { ChatEventParser } from '../ChatEventParser.js';

/**
 * Shout (server-wide).
 *   GuestABCD shouts: hello everyone
 *   --> GuestABCD looks around     (emote, also a shout)
 */
export class ShoutEventParser implements ChatEventParser {
  readonly name = 'ShoutEventParser';

  private static readonly SHOUT_RE =
    /^([A-Za-z]{3,17})(?:\([A-Z*]+\))* shouts:\s?(.*)$/;
  private static readonly EMOTE_RE =
    /^--> ([A-Za-z]{3,17})(?:\([A-Z*]+\))*\s?(.*)$/;

  parse(line: string): ChatEvent | null {
    const text = line.trim();
    let m = ShoutEventParser.SHOUT_RE.exec(text);
    if (m) {
      return makeChatEvent(ChatEventType.SHOUT, text, {
        source: m[1],
        message: m[2],
      });
    }
    m = ShoutEventParser.EMOTE_RE.exec(text);
    if (m) {
      return makeChatEvent(ChatEventType.SHOUT, text, {
        source: m[1],
        message: m[1] + ' ' + m[2],
      });
    }
    return null;
  }
}

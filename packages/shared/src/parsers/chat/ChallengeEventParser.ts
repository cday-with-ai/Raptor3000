import { ChatEventType } from '../../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../../events/ChatEvent.js';
import type { ChatEventParser } from '../ChatEventParser.js';

/**
 * Challenge received. Parity with ChallengeEventParser.java.
 *   Challenge: GuestXYZ (----) GuestABC (----) unrated blitz 5 0.
 */
export class ChallengeEventParser implements ChatEventParser {
  readonly name = 'ChallengeEventParser';
  private static readonly IDENT = 'Challenge: ';

  parse(line: string): ChatEvent | null {
    if (line.length >= 600) return null;
    const text = line.trim();
    if (!text.includes(ChallengeEventParser.IDENT)) return null;
    return makeChatEvent(ChatEventType.CHALLENGE, text, {
      message: text,
    });
  }
}

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
    if (!line.includes(ChallengeEventParser.IDENT)) return null;
    return makeChatEvent(ChatEventType.CHALLENGE, line, {
      message: line.trim(),
    });
  }
}

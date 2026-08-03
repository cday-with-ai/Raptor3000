import { ChatEventType } from '../../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../../events/ChatEvent.js';
import type { ChatEventParser } from '../ChatEventParser.js';

/**
 * Partnership ended. Parity with PartnershipEndedEventParser.java.
 *   You no longer have a bughouse partner.
 *   Your partner has ended partnership.
 */
export class PartnershipEndedEventParser implements ChatEventParser {
  readonly name = 'PartnershipEndedEventParser';
  private static readonly A = 'You no longer have a bughouse partner.';
  private static readonly B = 'Your partner has ended partnership.';

  parse(line: string): ChatEvent | null {
    if (line.length >= 100) return null;
    const text = line.trim();
    if (
      text.includes(PartnershipEndedEventParser.A) ||
      text.includes(PartnershipEndedEventParser.B)
    ) {
      return makeChatEvent(ChatEventType.PARTNERSHIP_DESTROYED, text, {
        message: text,
      });
    }
    return null;
  }
}

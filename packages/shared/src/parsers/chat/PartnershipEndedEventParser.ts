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
    if (
      line.includes(PartnershipEndedEventParser.A) ||
      line.includes(PartnershipEndedEventParser.B)
    ) {
      return makeChatEvent(ChatEventType.PARTNERSHIP_DESTROYED, line, {
        message: line.trim(),
      });
    }
    return null;
  }
}

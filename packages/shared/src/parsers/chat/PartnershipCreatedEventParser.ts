import { ChatEventType } from '../../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../../events/ChatEvent.js';
import { stripTitles } from '../../services/IcsUtils.js';
import type { ChatEventParser } from '../ChatEventParser.js';

/**
 * Partnership creation. Parity with PartnershipCreatedEventParser.java.
 *
 * Two forms:
 *   A) You agree to be GuestABCD's partner.
 *   B) GuestABCD agrees to be your partner.
 */
export class PartnershipCreatedEventParser implements ChatEventParser {
  readonly name = 'PartnershipCreatedEventParser';
  private static readonly A = 'You agree to be';
  private static readonly B = 'agrees to be your partner.';

  parse(line: string): ChatEvent | null {
    if (line.length >= 100) return null;
    // Form A
    const aIdx = line.indexOf(PartnershipCreatedEventParser.A);
    if (aIdx === 0 || aIdx === 1) {
      const remainder = line.substring(aIdx + PartnershipCreatedEventParser.A.length).trim();
      const m = /^([A-Za-z0-9]+)/.exec(remainder);
      if (m) {
        return makeChatEvent(ChatEventType.PARTNERSHIP_CREATED, line, {
          source: stripTitles(m[1]),
          message: line,
        });
      }
    }
    // Form B
    if (line.includes(PartnershipCreatedEventParser.B)) {
      const tokens = line.trim().split(/\s+/);
      if (tokens.length >= 2 && tokens[1] === 'agrees') {
        return makeChatEvent(ChatEventType.PARTNERSHIP_CREATED, line, {
          source: stripTitles(tokens[0]),
          message: line.trim(),
        });
      }
    }
    return null;
  }
}

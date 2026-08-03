import { ChatEventType } from '../../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../../events/ChatEvent.js';
import type { ChatEventParser } from '../ChatEventParser.js';

/**
 * Draw offer. Parity with DrawOfferedEventParser.java.
 *   GuestABCD offers you a draw.
 */
export class DrawOfferedEventParser implements ChatEventParser {
  readonly name = 'DrawOfferedEventParser';
  private static readonly IDENT = 'offers you a draw.';

  parse(line: string): ChatEvent | null {
    if (line.length >= 600) return null;
    const text = line.trim();
    if (!text.includes(DrawOfferedEventParser.IDENT)) return null;
    return makeChatEvent(ChatEventType.DRAW_REQUEST, text, {
      message: text,
    });
  }
}

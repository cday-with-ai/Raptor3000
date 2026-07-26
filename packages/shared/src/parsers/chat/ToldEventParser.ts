import { ChatEventType } from '../../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../../events/ChatEvent.js';
import { startsWithOrOffset1 } from '../../services/IcsUtils.js';
import type { ChatEventParser } from '../ChatEventParser.js';

/**
 * Told-confirmation events. Parity with ToldEventParser.java.
 *   (told GuestABCD)
 *
 * If the "who was told" is a pure integer (channel told), we suppress:
 *   (told 50) -> null
 */
export class ToldEventParser implements ChatEventParser {
  readonly name = 'ToldEventParser';

  parse(line: string): ChatEvent | null {
    const PREFIX = '(told ';
    if (!startsWithOrOffset1(line, PREFIX)) return null;

    // Find the source between "(told " and the first space/comma/paren.
    const offset = line.startsWith(PREFIX) ? PREFIX.length : PREFIX.length + 1;
    const remainder = line.substring(offset);
    const m = /^([^\s,)]+)/.exec(remainder);
    if (!m) return null;
    const source = m[1].trim();
    if (source.length === 0) return null;
    // Channel-told suppression: (told 50)
    if (/^\d+$/.test(source)) return null;

    return makeChatEvent(ChatEventType.TOLD, line, {
      source, // NO stripTitles per Raptor
      message: line.trim(),
    });
  }
}

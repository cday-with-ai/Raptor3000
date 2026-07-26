import { ChatEventType } from '../../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../../events/ChatEvent.js';
import { stripTitles } from '../../services/IcsUtils.js';
import type { ChatEventParser } from '../ChatEventParser.js';

/**
 * Ping-response parser. Parity with PingEventParser.java.
 *   Average ping time for GuestABCD is 42ms.
 */
export class PingEventParser implements ChatEventParser {
  readonly name = 'PingEventParser';
  private static readonly RE = /^Average ping time for (\D+) is (\d+)ms\.$/;

  parse(line: string): ChatEvent | null {
    if (line.length >= 600) return null;
    if (!line.includes('Average ping time for ')) return null;
    const m = PingEventParser.RE.exec(line.trim());
    if (!m) return null;
    const who = stripTitles(m[1].trim());
    const ms = parseInt(m[2], 10);
    return makeChatEvent(ChatEventType.PING_RESPONSE, line, {
      source: who,
      message: line.trim(),
      pingMs: ms,
    });
  }
}

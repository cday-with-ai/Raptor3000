import { ChatEventType } from '../../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../../events/ChatEvent.js';
import { stripTitles, offsetAfterPrefix } from '../../services/IcsUtils.js';
import type { ChatEventParser } from '../ChatEventParser.js';

/**
 * Notify arrival/departure. Parity with NotificationEventParser.java.
 *   Notification: GuestABCD has arrived.
 *   Notification: GuestABCD has departed.
 */
export class NotificationEventParser implements ChatEventParser {
  readonly name = 'NotificationEventParser';
  private static readonly PREFIX = 'Notification: ';
  private static readonly DEPARTED = 'departed.';

  parse(line: string): ChatEvent | null {
    if (line.length >= 600 && !line.startsWith(NotificationEventParser.PREFIX, 1)) return null;
    const text = line.trim();
    if (offsetAfterPrefix(text, NotificationEventParser.PREFIX) < 0) return null;
    const tokens = text.split(/\s+/);
    // tokens[0] = "Notification:" tokens[1] = name
    if (tokens.length < 2) return null;
    const source = stripTitles(tokens[1]);
    const isDeparture = text.includes(NotificationEventParser.DEPARTED);
    return makeChatEvent(
      isDeparture
        ? ChatEventType.NOTIFICATION_DEPARTURE
        : ChatEventType.NOTIFICATION_ARRIVAL,
      text,
      { source, message: text },
    );
  }
}

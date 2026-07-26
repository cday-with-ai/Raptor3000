import { ChatEventType } from '../../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../../events/ChatEvent.js';
import { stripTitles, startsWithOrOffset1 } from '../../services/IcsUtils.js';
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
    if (!startsWithOrOffset1(line, NotificationEventParser.PREFIX)) return null;
    const tokens = line.trim().split(/\s+/);
    // tokens[0] = "Notification:" tokens[1] = name
    if (tokens.length < 2) return null;
    const source = stripTitles(tokens[1]);
    const isDeparture = line.includes(NotificationEventParser.DEPARTED);
    return makeChatEvent(
      isDeparture
        ? ChatEventType.NOTIFICATION_DEPARTURE
        : ChatEventType.NOTIFICATION_ARRIVAL,
      line,
      { source, message: line.trim() },
    );
  }
}

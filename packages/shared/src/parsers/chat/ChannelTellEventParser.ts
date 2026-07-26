import { ChatEventType } from '../../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../../events/ChatEvent.js';
import type { ChatEventParser } from '../ChatEventParser.js';

/**
 * Channel tell.
 *   GuestABCD(50): hi       (channel 50)
 *   GM-Bob(SR)(GM)(50): hi  (with titles)
 */
export class ChannelTellEventParser implements ChatEventParser {
  readonly name = 'ChannelTellEventParser';

  // 1=username, 2=channel number, 3=message
  private static readonly RE =
    /^([A-Za-z]{3,17})(?:\([A-Z*]+\))*\((\d+)\):\s?(.*)$/;

  parse(line: string): ChatEvent | null {
    const m = ChannelTellEventParser.RE.exec(line);
    if (!m) return null;
    return makeChatEvent(ChatEventType.CHANNEL_TELL, line, {
      source: m[1],
      channel: m[2],
      message: m[3],
    });
  }
}

import { ChatEventType } from '../../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../../events/ChatEvent.js';
import { stripTitles, offsetAfterPrefix } from '../../services/IcsUtils.js';
import type { ChatEventParser } from '../ChatEventParser.js';

/**
 * `finger` command response. Parity with FingerEventParser.java.
 * Multi-line; we only see the whole block here.
 *
 *   Finger of GuestABCD(U):
 *   On for: ...
 *   ...
 */
export class FingerEventParser implements ChatEventParser {
  readonly name = 'FingerEventParser';
  private static readonly PREFIX = 'Finger of ';

  parse(line: string): ChatEvent | null {
    const text = line.trim();
    const offset = offsetAfterPrefix(text, FingerEventParser.PREFIX);
    if (offset < 0) return null;
    const after = text.substring(offset);
    const m = /^([A-Za-z0-9_()*]+)/.exec(after);
    if (!m) return null;
    return makeChatEvent(ChatEventType.FINGER, text, {
      source: stripTitles(m[1]),
      message: text,
    });
  }
}

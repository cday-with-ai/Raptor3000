import { ChatEventType } from '../../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../../events/ChatEvent.js';
import { stripTitles, startsWithOrOffset1 } from '../../services/IcsUtils.js';
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
    if (!startsWithOrOffset1(line, FingerEventParser.PREFIX)) return null;
    const offset = line.startsWith(FingerEventParser.PREFIX)
      ? FingerEventParser.PREFIX.length
      : FingerEventParser.PREFIX.length + 1;
    const after = line.substring(offset);
    const m = /^([A-Za-z0-9_()*]+)/.exec(after);
    if (!m) return null;
    return makeChatEvent(ChatEventType.FINGER, line, {
      source: stripTitles(m[1]),
      message: line,
    });
  }
}

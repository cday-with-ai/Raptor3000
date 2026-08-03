import { ChatEventType } from '../../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../../events/ChatEvent.js';
import { stripTitles } from '../../services/IcsUtils.js';
import type { ChatEventParser } from '../ChatEventParser.js';

/**
 * Following state changes. Parity with FollowingEventParser.java.
 *   You will now be following pindik's games.
 *   You will not follow any player's games.
 */
export class FollowingEventParser implements ChatEventParser {
  readonly name = 'FollowingEventParser';
  private static readonly FOLLOW_IDENT = 'You will now be following';
  private static readonly NOT_FOLLOW_IDENT = "You will not follow any player's games.";

  parse(line: string): ChatEvent | null {
    if (line.length >= 200) return null;
    const text = line.trim();
    if (text.includes(FollowingEventParser.NOT_FOLLOW_IDENT)) {
      return makeChatEvent(ChatEventType.NOT_FOLLOWING, text, {
        message: text,
      });
    }
    const idx = text.indexOf(FollowingEventParser.FOLLOW_IDENT);
    if (idx === -1) return null;
    const after = text.substring(idx + FollowingEventParser.FOLLOW_IDENT.length).trimStart();
    // Split on space, apostrophe, or open-paren to extract just the handle
    // (before "'s games.").
    const m = /^([A-Za-z0-9_]+)/.exec(after);
    if (!m) return null;
    return makeChatEvent(ChatEventType.FOLLOWING, text, {
      source: stripTitles(m[1]),
      message: text,
    });
  }
}

import { ChatEventType } from '../../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../../events/ChatEvent.js';
import { stripTitles } from '../../services/IcsUtils.js';
import type { ChatEventParser } from '../ChatEventParser.js';

/**
 * Kibitz. Parity with KibitzEventParser.java.
 *   GuestABCD(1234)[42] kibitzes: nice move!
 *
 * gameId is the number in square brackets.
 */
export class KibitzEventParser implements ChatEventParser {
  readonly name = 'KibitzEventParser';

  parse(line: string): ChatEvent | null {
    if (line.length >= 600) return null;
    const text = line.trim();
    const tokens = text.split(/\s+/);
    if (tokens.length < 2) return null;
    if (tokens[1] !== 'kibitzes:') return null;

    const openBracket = text.indexOf('[');
    const closeBracket = text.indexOf(']');
    const gameId =
      openBracket >= 0 && closeBracket > openBracket
        ? text.substring(openBracket + 1, closeBracket)
        : null;

    // Source token looks like "GuestABCD(1234)[42]" — keep just the handle.
    const handle = /^([A-Za-z][A-Za-z0-9_]{1,16})/.exec(stripTitles(tokens[0]));
    if (!handle) return null;
    return makeChatEvent(ChatEventType.KIBITZ, text, {
      source: handle[1],
      message: text,
      gameId,
    });
  }
}

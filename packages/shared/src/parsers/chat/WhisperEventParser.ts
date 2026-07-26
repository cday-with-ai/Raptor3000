import { ChatEventType } from '../../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../../events/ChatEvent.js';
import { stripTitles } from '../../services/IcsUtils.js';
import type { ChatEventParser } from '../ChatEventParser.js';

/**
 * Whisper (visible to observers only). Parity with WhisperEventParser.java.
 *   GuestABCD(1234)[42] whispers: nice move!
 *
 * gameId is the number in square brackets.
 */
export class WhisperEventParser implements ChatEventParser {
  readonly name = 'WhisperEventParser';

  parse(line: string): ChatEvent | null {
    if (line.length >= 600) return null;
    const tokens = line.split(/\s+/);
    if (tokens.length < 2) return null;
    if (tokens[1] !== 'whispers:') return null;

    const openBracket = line.indexOf('[');
    const closeBracket = line.indexOf(']');
    const gameId =
      openBracket >= 0 && closeBracket > openBracket
        ? line.substring(openBracket + 1, closeBracket)
        : null;

    const handle = /^([A-Za-z][A-Za-z0-9_]{1,16})/.exec(stripTitles(tokens[0]));
    if (!handle) return null;
    return makeChatEvent(ChatEventType.WHISPER, line, {
      source: handle[1],
      message: line.trim(),
      gameId,
    });
  }
}

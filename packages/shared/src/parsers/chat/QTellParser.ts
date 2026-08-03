import { ChatEventType } from '../../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../../events/ChatEvent.js';
import type { ChatEventParser } from '../ChatEventParser.js';

/**
 * QTell (bots). Parity with QTellParser.java.
 *   :some bot message
 *
 * Lines starting with ':' are bot QTells. No source (the bot's name appears
 * inside the message, not in a structured field). The leading-newline form
 * `\n:` that FICS actually sends is handled by the trim, as in Raptor.
 */
export class QTellParser implements ChatEventParser {
  readonly name = 'QTellParser';

  parse(line: string): ChatEvent | null {
    const text = line.trim();
    if (!text.startsWith(':')) return null;
    return makeChatEvent(ChatEventType.QTELL, text, {
      message: text,
    });
  }
}

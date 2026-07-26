import { ChatEventType } from '../../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../../events/ChatEvent.js';
import type { ChatEventParser } from '../ChatEventParser.js';

/**
 * QTell (bots). Parity with QTellParser.java.
 *   :some bot message
 *
 * Lines starting with ':' (or '\n:') are bot QTells. No source (the bot's
 * name appears inside the message, not in a structured field).
 */
export class QTellParser implements ChatEventParser {
  readonly name = 'QTellParser';

  parse(line: string): ChatEvent | null {
    if (!(line.startsWith(':') || line.startsWith('\n:'))) return null;
    return makeChatEvent(ChatEventType.QTELL, line, {
      message: line.trim(),
    });
  }
}

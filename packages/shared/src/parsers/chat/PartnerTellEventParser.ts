import { ChatEventType } from '../../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../../events/ChatEvent.js';
import { stripTitles } from '../../services/IcsUtils.js';
import type { ChatEventParser } from '../ChatEventParser.js';

/**
 * Partner tell (bughouse). Parity with PartnerTellEventParser.java.
 *   GMBob (your partner) tells you: drop knight h4
 *
 * Rules: length < 600; first token is source (reject if contains any digit);
 * if source ends with `%` treat next token as source (prompt prefix);
 * token after source must be literal `(your`.
 */
export class PartnerTellEventParser implements ChatEventParser {
  readonly name = 'PartnerTellEventParser';

  parse(line: string): ChatEvent | null {
    if (line.length >= 600) return null;
    const text = line.trim();
    const tokens = text.split(/\s+/);
    if (tokens.length < 3) return null;

    let idx = 0;
    let source = tokens[idx];
    if (/[0-9]/.test(source)) return null;
    if (source.endsWith('%')) {
      idx++;
      if (idx >= tokens.length) return null;
      source = tokens[idx];
      if (/[0-9]/.test(source)) return null;
    }
    if (tokens[idx + 1] !== '(your') return null;

    return makeChatEvent(ChatEventType.PARTNER_TELL, text, {
      source: stripTitles(source),
      message: text,
    });
  }
}

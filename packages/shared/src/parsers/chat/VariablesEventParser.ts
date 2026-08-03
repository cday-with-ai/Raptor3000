import { ChatEventType } from '../../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../../events/ChatEvent.js';
import { startsWithOrOffset1 } from '../../services/IcsUtils.js';
import type { ChatEventParser } from '../ChatEventParser.js';

/**
 * `variables` command response. Parity with VariablesEventParser.java.
 * NO stripTitles on username.
 */
export class VariablesEventParser implements ChatEventParser {
  readonly name = 'VariablesEventParser';
  private static readonly PREFIX = 'Variable settings of ';

  parse(line: string): ChatEvent | null {
    const text = line.trim();
    if (!startsWithOrOffset1(text, VariablesEventParser.PREFIX)) return null;
    const offset = text.startsWith(VariablesEventParser.PREFIX)
      ? VariablesEventParser.PREFIX.length
      : VariablesEventParser.PREFIX.length + 1;
    const after = text.substring(offset);
    const m = /^([A-Za-z0-9_()*]+)/.exec(after);
    if (!m) return null;
    return makeChatEvent(ChatEventType.VARIABLES, text, {
      source: m[1],
      message: text,
    });
  }
}

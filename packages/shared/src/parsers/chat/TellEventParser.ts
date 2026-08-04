import { ChatEventType } from '../../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../../events/ChatEvent.js';
import type { ChatEventParser } from '../ChatEventParser.js';

/**
 * Personal tell, in both of the forms FICS sends it.
 *   GuestABCD tells you: hi there              (`tell` — from anywhere)
 *   GuestABCD(*)(SR)(GM) tells you: hello      (titles in parens)
 *   GuestABCD says: good luck                  (`say` — in-game, to opponent)
 *
 * `says:` is the in-game form: FICS's `say` goes to your current opponent, and
 * during a bughouse match also to your partner and your partner's opponent
 * (Help/say). Raptor's TellEventParser.java matches it as its *first* branch —
 * `s2.equals("says:")` — and emits ChatType.TELL for it, the same type as
 * `tells you:`; there is no separate SAY in ChatType. Our port had only the
 * `tells you:` branch, so an opponent's `say` matched nothing in the chain and
 * arrived as UNKNOWN.
 *
 * Raptor decides the match on tokens (`RaptorStringTokenizer(text, " \r\n")`),
 * which puts no constraint on the handle token and lets a multi-line chunk
 * match on its first line. This keeps the port's line-anchored pattern and
 * only adds the verb, because the chat chain is handed whole chunks — see
 * PLAN.md for that divergence, which is deliberate and not yet resolved.
 */
export class TellEventParser implements ChatEventParser {
  readonly name = 'TellEventParser';

  // 1=username (handle only), 2=message
  private static readonly RE =
    /^([A-Za-z]{3,17})(?:\([A-Z*]+\))* (?:tells you|says):\s?(.*)$/;

  parse(line: string): ChatEvent | null {
    const text = line.trim();
    const m = TellEventParser.RE.exec(text);
    if (!m) return null;
    return makeChatEvent(ChatEventType.TELL, text, {
      source: m[1],
      message: m[2],
    });
  }
}

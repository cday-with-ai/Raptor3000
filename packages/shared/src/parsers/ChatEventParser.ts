import type { ChatEvent } from '../events/ChatEvent.js';

/**
 * A parser for a single FICS message type.
 *
 * Direct port of Raptor's ChatEventParser abstract base
 * (/tmp/raptor/raptor/src/raptor/connector/ics/chat/ChatEventParser.java).
 * The Raptor project (https://github.com/fbergo/Raptor, BSD license) is
 * the source of this pattern and of every concrete parser that implements
 * this interface.
 *
 * Contract (from Raptor's ChatEventParser.java):
 *   - Return a ChatEvent if the input matches this parser's message type.
 *   - Return null if it doesn't — the orchestrator will try the next parser.
 *   - **Trim first.** Every Raptor chat parser opens with `text = text.trim()`
 *     and stores the trimmed text on the event. This is not cosmetic: FICS
 *     blocks begin with a newline, so the chunk a parser is handed starts
 *     `\n...` in real traffic and any `^`-anchored pattern fails against it.
 *     A parser must be correct when called directly on a raw chunk, not only
 *     when FicsParser has tidied the input — which is why the trim lives here
 *     per-parser rather than once in the orchestrator.
 *
 * Parsers are registered in priority order; earlier parsers match first.
 * Each parser should be a pure function over its input line (no side
 * effects, no hidden state) so it's trivial to unit test.
 */
export interface ChatEventParser {
  readonly name: string;
  parse(line: string): ChatEvent | null;
}

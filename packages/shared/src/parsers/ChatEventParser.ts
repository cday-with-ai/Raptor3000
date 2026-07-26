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
 *
 * Parsers are registered in priority order; earlier parsers match first.
 * Each parser should be a pure function over its input line (no side
 * effects, no hidden state) so it's trivial to unit test.
 */
export interface ChatEventParser {
  readonly name: string;
  parse(line: string): ChatEvent | null;
}

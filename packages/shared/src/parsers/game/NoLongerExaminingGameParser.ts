import type { GameMessageParser } from '../FicsParser.js';
import type { NoLongerExaminingGameMessage } from '../../models/messages/NoLongerExaminingGameMessage.js';
import { RaptorTokenizer } from './tokenizer.js';

/**
 * `You are no longer examining game N.` — direct port of Raptor's
 * `NoLongerExaminingGameParser.java` (BSD).
 */
export class NoLongerExaminingGameParser
  implements GameMessageParser<NoLongerExaminingGameMessage>
{
  readonly name = 'NoLongerExaminingGameParser';
  static readonly PREFIX = 'You are no longer examining game';

  parse(message: string): NoLongerExaminingGameMessage | null {
    if (!message.startsWith(NoLongerExaminingGameParser.PREFIX)) return null;

    const tok = new RaptorTokenizer(message, ' .');
    // parse past "You are no longer examining game"
    tok.nextToken();
    tok.nextToken();
    tok.nextToken();
    tok.nextToken();
    tok.nextToken();
    tok.nextToken();
    const gameId = tok.nextToken();
    return { gameId };
  }
}

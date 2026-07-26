import type { GameMessageParser } from '../FicsParser.js';
import type { RemovingObsGameMessage } from '../../models/messages/RemovingObsGameMessage.js';
import { RaptorTokenizer } from './tokenizer.js';

/**
 * `Removing game N from observation list.` — direct port of Raptor's
 * `RemovingObsGameParser.java` (BSD).
 */
export class RemovingObsGameParser
  implements GameMessageParser<RemovingObsGameMessage>
{
  readonly name = 'RemovingObsGameParser';
  static readonly PREFIX = 'Removing game ';

  parse(message: string): RemovingObsGameMessage | null {
    if (!message.startsWith(RemovingObsGameParser.PREFIX)) return null;

    const tok = new RaptorTokenizer(message, ' ');
    tok.nextToken(); // Removing
    tok.nextToken(); // game
    const gameId = tok.nextToken();
    return { gameId };
  }
}

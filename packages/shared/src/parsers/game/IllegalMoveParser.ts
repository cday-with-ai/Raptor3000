import type { GameMessageParser } from '../FicsParser.js';
import type { IllegalMoveMessage } from '../../models/messages/IllegalMoveMessage.js';

/**
 * Server move-rejection. Direct port of Raptor's
 * `IllegalMoveParser.java` (BSD).
 *
 * Example line:
 *   Illegal move (e4).
 */
export class IllegalMoveParser implements GameMessageParser<IllegalMoveMessage> {
  readonly name = 'IllegalMoveParser';
  static readonly ILLEGAL_MOVE_START = 'Illegal move (';

  parse(message: string): IllegalMoveMessage | null {
    if (!message.startsWith(IllegalMoveParser.ILLEGAL_MOVE_START)) return null;
    const closingParen = message.indexOf(')');
    const move = message.substring(
      IllegalMoveParser.ILLEGAL_MOVE_START.length,
      closingParen,
    );
    return { move };
  }
}

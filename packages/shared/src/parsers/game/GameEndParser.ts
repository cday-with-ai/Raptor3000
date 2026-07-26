import type { GameMessageParser } from '../FicsParser.js';
import { GameEndType, type GameEndMessage, type GameEndTypeCode } from '../../models/messages/GameEndMessage.js';
import { RaptorTokenizer } from './tokenizer.js';

/**
 * Game-end `{Game N (White vs. Black) description} score` line. Direct
 * port of Raptor's `GameEndParser.java` (BSD).
 *
 * Examples:
 *   {Game 117 (raptora vs. raptorb) raptora resigns} 0-1
 *   {Game 117 (raptora vs. raptorb) Game drawn by mutual agreement} 1/2-1/2
 *   {Game 117 (raptora vs. raptorb) Game aborted on move 1} *
 *
 * The `"Creating"` substring is excluded because FICS also emits lines
 * like `{Game 117 (raptora vs. raptorb) Creating: rated blitz 5 0}` at
 * game start, which we must not classify as game-end.
 */
export class GameEndParser implements GameMessageParser<GameEndMessage> {
  readonly name = 'GameEndParser';
  static readonly EXCLUDE = 'Creating';
  static readonly GAME_END = '{Game';

  parse(message: string): GameEndMessage | null {
    if (!message.startsWith(GameEndParser.GAME_END)) return null;
    if (message.includes(GameEndParser.EXCLUDE)) return null;

    const tok = new RaptorTokenizer(message, ' ()');
    tok.nextToken();                 // {Game
    const gameId = tok.nextToken();
    const whiteName = tok.nextToken();
    tok.nextToken();                 // vs.
    const blackName = tok.nextToken();

    const closingParen = message.indexOf(')');
    const closingBrace = message.indexOf('}');
    if (closingParen === -1 || closingBrace === -1) {
      throw new Error(`Could not find description in gameEndEvent: ${message}`);
    }
    const description = message.substring(closingParen + 1, closingBrace).trim();
    const afterBrace = message.substring(closingBrace + 1).trim();

    let type: GameEndTypeCode;
    if (description.indexOf('aborted') !== -1) {
      type = GameEndType.ABORTED;
    } else if (description.indexOf('adjourned') !== -1) {
      type = GameEndType.ADJOURNED;
    } else if (description.indexOf('*') !== -1) {
      type = GameEndType.UNDETERMINED;
    } else if (afterBrace.startsWith('0-1')) {
      type = GameEndType.BLACK_WON;
    } else if (afterBrace.startsWith('1-0')) {
      type = GameEndType.WHITE_WON;
    } else if (afterBrace.startsWith('1/2')) {
      type = GameEndType.DRAW;
    } else {
      type = GameEndType.UNDETERMINED;
    }

    return { gameId, whiteName, blackName, description, type };
  }
}

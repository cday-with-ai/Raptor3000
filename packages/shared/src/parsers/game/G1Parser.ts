import type { GameMessageParser } from '../FicsParser.js';
import type { G1Message } from '../../models/messages/G1Message.js';
import { RaptorTokenizer } from './tokenizer.js';

/**
 * `<g1>` game-start (FICS ivariable "gameinfo"). Direct port of Raptor's
 * `G1Parser.java` (BSD).
 *
 * Example line:
 *   <g1> 1 p=0 t=blitz r=1 u=1,1 it=5,5 i=8,8 pt=0 rt=1586E,2100 ts=1,0 m=0 n=0
 *
 * The FICS `u=X,Y` field means "is unregistered" — Raptor flips it to
 * `isWhite/BlackRegistered` by negating. We preserve that.
 */
export class G1Parser implements GameMessageParser<G1Message> {
  readonly name = 'G1Parser';
  static readonly G1 = '<g1>';

  parse(message: string): G1Message | null {
    if (!message.startsWith(G1Parser.G1)) return null;

    const tok = new RaptorTokenizer(message, ' =,');

    // parse past <g1>
    tok.nextToken();

    const gameId = tok.nextToken();

    tok.nextToken(); // p
    const isPrivate = tok.nextToken() === '1';

    tok.nextToken(); // t
    const gameTypeDescription = tok.nextToken();

    tok.nextToken(); // r
    const isRated = tok.nextToken() === '1';

    tok.nextToken(); // u
    const isWhiteRegistered = tok.nextToken() !== '1';
    const isBlackRegistered = tok.nextToken() !== '1';

    tok.nextToken(); // it
    const initialWhiteTimeMillis = parseInt(tok.nextToken(), 10) * 1000;
    const initialWhiteIncMillis = parseInt(tok.nextToken(), 10) * 1000;

    tok.nextToken(); // i
    const initialBlackTimeMillis = parseInt(tok.nextToken(), 10) * 1000;
    const initialBlackIncMillis = parseInt(tok.nextToken(), 10) * 1000;

    tok.nextToken(); // pt
    const partnerGameId = tok.nextToken();

    tok.nextToken(); // rt
    let whiteRating = tok.nextToken();
    let blackRating = tok.nextToken();

    tok.nextToken(); // ts
    const isWhiteUsingTimeseal = tok.nextToken() === '1';
    const isBlackUsingTimeseal = tok.nextToken() === '1';

    if (!isBlackRegistered) blackRating = '++++';
    if (!isWhiteRegistered) whiteRating = '++++';

    return {
      gameId,
      gameTypeDescription,
      isPrivate,
      isRated,
      isWhiteRegistered,
      isBlackRegistered,
      initialWhiteTimeMillis,
      initialBlackTimeMillis,
      initialWhiteIncMillis,
      initialBlackIncMillis,
      // Remaining times not populated by Raptor's G1Parser — they get
      // filled in by the subsequent Style12 update.
      whiteRemainingTime: 0,
      blackRemainingTime: 0,
      whiteRating,
      blackRating,
      partnerGameId,
      isWhiteUsingTimeseal,
      isBlackUsingTimeseal,
    };
  }
}

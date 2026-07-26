import type { GameMessageParser } from '../FicsParser.js';
import type { B1Message } from '../../models/messages/B1Message.js';
import { RaptorTokenizer } from './tokenizer.js';

/**
 * `<b1>` bughouse/crazyhouse piece-holdings update. Direct port of
 * Raptor's `B1Parser.java` (BSD).
 *
 * Example line:
 *   <b1> game 6 white [PNBBB] black [PNB]
 *   <b1> game 6 white [PNBBB] black [PNB] <- BN      (passed-piece annotation)
 *
 * The optional `<- BN` suffix is discarded — Raptor reads up to the black
 * holdings and stops.
 *
 * Holdings indexing is parity with `GameConstants`: 0 unused, 1=PAWN,
 * 2=BISHOP, 3=KNIGHT, 4=ROOK, 5=QUEEN, 6=KING. The array has length 7.
 */
export class B1Parser implements GameMessageParser<B1Message> {
  readonly name = 'B1Parser';
  static readonly B1 = '<b1>';

  parse(message: string): B1Message | null {
    if (!message.startsWith(B1Parser.B1)) return null;

    const tok = new RaptorTokenizer(message, ' {}><-\n');

    tok.nextToken(); // b1
    tok.nextToken(); // game
    const gameId = tok.nextToken();
    tok.nextToken(); // white
    const whiteHoldingsRaw = tok.nextToken();
    tok.nextToken(); // black
    const blackHoldingsRaw = tok.nextToken();

    const whiteHoldings = buildPieceHoldings(
      whiteHoldingsRaw.substring(1, whiteHoldingsRaw.length - 1),
    );
    const blackHoldings = buildPieceHoldings(
      blackHoldingsRaw.substring(1, blackHoldingsRaw.length - 1),
    );

    return { gameId, whiteHoldings, blackHoldings };
  }
}

const PAWN = 1, BISHOP = 2, KNIGHT = 3, ROOK = 4, QUEEN = 5, KING = 6;

function buildPieceHoldings(s: string): number[] {
  const result: number[] = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < s.length; i++) {
    switch (s.charAt(i).toLowerCase()) {
      case 'p': result[PAWN]++; break;
      case 'n': result[KNIGHT]++; break;
      case 'b': result[BISHOP]++; break;
      case 'r': result[ROOK]++; break;
      case 'q': result[QUEEN]++; break;
      case 'k': result[KING]++; break;
      default:
        throw new Error(`Invalid piece '${s.charAt(i)}' in holdings`);
    }
  }
  return result;
}

import type { GameMessageParser } from '../FicsParser.js';
import type { Style12Message, Style12RelationCode } from '../../models/messages/Style12Message.js';
import { RaptorTokenizer, timeToLong } from './tokenizer.js';

/**
 * Parses a FICS `<12>` board record. Direct port of Raptor's
 * `raptor/connector/ics/Style12Parser.java` (BSD).
 *
 * Example line:
 *   <12>rnbqkbnr pppppppp -------- -------- ----P--- -------- PPPP-PPP RNBQKBNR B 4 1 1 1 1 0 100 guestBLARG guestcday 1 10 0 39 39 600 600 1 P/e2-e4 (0:00.000) e4 1 0 0
 *
 * Both initial time and increment arrive from FICS in minutes — the
 * freechess.org help file's "in seconds" wording is stale. Multiplying
 * each by `1000 * 60` is the correct conversion.
 */
export class Style12Parser implements GameMessageParser<Style12Message> {
  readonly name = 'Style12Parser';
  static readonly STYLE_12 = '<12>';

  parse(message: string): Style12Message | null {
    if (!message.startsWith(Style12Parser.STYLE_12)) return null;

    const tok = new RaptorTokenizer(message, ' <>\n');

    // parse past <12>.
    tok.nextToken();

    let positionString = '';
    for (let i = 0; i < 8; i++) {
      positionString += tok.nextToken();
    }

    const isWhitesMoveAfterMoveIsMade = tok.nextToken() === 'W';
    const doublePawnPushFile = parseInt(tok.nextToken(), 10);
    const canWhiteCastleKSide = tok.nextToken() === '1';
    const canWhiteCastleQSide = tok.nextToken() === '1';
    const canBlackCastleKSide = tok.nextToken() === '1';
    const canBlackCastleQSide = tok.nextToken() === '1';
    const numberOfMovesSinceLastIrreversible = parseInt(tok.nextToken(), 10);

    const gameId = tok.nextToken();
    const whiteName = tok.nextToken();
    const blackName = tok.nextToken();
    const relation = parseInt(tok.nextToken(), 10) as Style12RelationCode;

    const initialTimeMillis = parseInt(tok.nextToken(), 10) * 1000 * 60;
    const initialIncMillis = parseInt(tok.nextToken(), 10) * 1000 * 60;

    const whiteStrength = parseInt(tok.nextToken(), 10);
    const blackStrength = parseInt(tok.nextToken(), 10);
    const whiteRemainingTimeMillis = parseInt(tok.nextToken(), 10);
    const blackRemainingTimeMillis = parseInt(tok.nextToken(), 10);

    const fullMoveNumber = parseInt(tok.nextToken(), 10);
    const lan = tok.nextToken();
    const timeTakenForLastMoveMillis = timeToLong(tok.nextToken());
    const san = tok.nextToken();
    const isWhiteOnTop = tok.nextToken() === '1';

    const position = parsePosition(positionString);

    const isClockTicking = tok.nextToken() === '1';
    const lagInMillis = parseInt(tok.nextToken(), 10);

    return {
      gameId,
      position,
      isWhitesMoveAfterMoveIsMade,
      doublePawnPushFile,
      canWhiteCastleKSide,
      canWhiteCastleQSide,
      canBlackCastleKSide,
      canBlackCastleQSide,
      numberOfMovesSinceLastIrreversible,
      whiteName,
      blackName,
      relation,
      initialTimeMillis,
      initialIncMillis,
      whiteStrength,
      blackStrength,
      whiteRemainingTimeMillis,
      blackRemainingTimeMillis,
      fullMoveNumber,
      san,
      lan,
      timeTakenForLastMoveMillis,
      lagInMillis,
      isClockTicking,
      isWhiteOnTop,
    };
  }
}

/**
 * Piece codes at exact parity with Raptor's `GameConstants` (0 = EMPTY,
 * W* = 1..6, B* = 7..12).
 */
const EMPTY = 0;
const WP = 1, WB = 2, WN = 3, WR = 4, WQ = 5, WK = 6;
const BP = 7, BB = 8, BN = 9, BR = 10, BQ = 11, BK = 12;

/**
 * Parse a 64-char position string (8 ranks of 8 files, concatenated, top
 * rank first) into `position[rank][file]` where `position[0][0]` is a1
 * and `position[7][7]` is h8.
 */
function parsePosition(s: string): number[][] {
  const result: number[][] = [];
  let k = 0;
  for (let i = 7; i >= 0; i--) {
    const row: number[] = new Array<number>(8);
    for (let j = 0; j < 8; j++) {
      const ch = s.charAt(k++);
      row[j] = pieceFromChar(ch, k, s);
    }
    result[i] = row;
  }
  return result;
}

function pieceFromChar(ch: string, pos: number, full: string): number {
  switch (ch) {
    case '-': return EMPTY;
    case 'p': return BP;
    case 'n': return BN;
    case 'b': return BB;
    case 'r': return BR;
    case 'q': return BQ;
    case 'k': return BK;
    case 'P': return WP;
    case 'N': return WN;
    case 'B': return WB;
    case 'R': return WR;
    case 'Q': return WQ;
    case 'K': return WK;
    default:
      throw new Error(`Invalid piece '${ch}' at ${pos} in ${full}`);
  }
}

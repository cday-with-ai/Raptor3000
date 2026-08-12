import { makeFen, parseFen } from 'chessops/fen';
import { Chess } from 'chessops/chess';
import type { Position } from 'chessops/chess';
import { parseSan, makeSanAndPlay } from 'chessops/san';
import { parseUci } from 'chessops/util';

/**
 * Bridge between the FICS side of the app (Style12 grids, SAN strings,
 * UCI PVs) and chessops, the rules library. Everything here is pure and
 * standard-chess only — FICS variants fail soft (a PV stops converting,
 * a replay stops early) rather than throwing.
 *
 * chessops was chosen 2026-08-12 over porting ChessAPI (see PLAN):
 * lichess's own TS library, variant support for later, zero DOM.
 */

/** chessops role → Style12 piece code (1..6 white, 7..12 black). */
const ROLE_CODE: Record<string, number> = {
  pawn: 1,
  bishop: 2,
  knight: 3,
  rook: 4,
  queen: 5,
  king: 6,
};

/** Convert a chessops position to the Style12 `position[rank][file]` grid. */
export function positionToGrid(pos: Position): number[][] {
  const grid: number[][] = Array.from({ length: 8 }, () => Array(8).fill(0));
  for (let sq = 0; sq < 64; sq++) {
    const piece = pos.board.get(sq);
    if (!piece) continue;
    const rank = Math.floor(sq / 8);
    const file = sq % 8;
    grid[rank][file] =
      ROLE_CODE[piece.role] + (piece.color === 'black' ? 6 : 0);
  }
  return grid;
}

/**
 * Replay a SAN move list from the standard starting position.
 * `grids[i]` is the position after ply `i` (grids[0] = start), so a
 * move list entry for ply p (1-based) renders `grids[p]`. Stops at the
 * first move chessops can't parse (variant, corrupt list): every ply
 * beyond `grids.length - 1` is simply not viewable.
 */
export function replaySans(
  sans: readonly string[],
): { grids: number[][][]; fens: string[] } {
  const pos = Chess.default();
  const grids: number[][][] = [positionToGrid(pos)];
  const fens: string[] = [makeFen(pos.toSetup())];
  for (const san of sans) {
    const move = parseSan(pos, san);
    if (!move) break;
    pos.play(move);
    grids.push(positionToGrid(pos));
    fens.push(makeFen(pos.toSetup()));
  }
  return { grids, fens };
}

export interface SanLine {
  /** SAN moves, in order from the position. */
  sans: string[];
  /** Full-move number of the first move in `sans`. */
  moveNumber: number;
  /** True if the first move in `sans` is Black's. */
  startsWithBlack: boolean;
}

/**
 * Convert a UCI PV to SAN against the position it was analyzed from.
 * Stops quietly at the first unconvertible move.
 */
export function pvToSan(fen: string, uciMoves: readonly string[], maxPlies = 12): SanLine | null {
  const setup = parseFen(fen);
  if (setup.isErr) return null;
  const posResult = Chess.fromSetup(setup.unwrap());
  if (posResult.isErr) return null;
  const pos = posResult.unwrap();
  const moveNumber = pos.fullmoves;
  const startsWithBlack = pos.turn === 'black';
  const sans: string[] = [];
  for (const uci of uciMoves.slice(0, maxPlies)) {
    const move = parseUci(uci);
    if (!move) break;
    // makeSanAndPlay does not validate; an illegal move (stale PV against
    // a newer position) must stop the line, not corrupt it.
    if (!pos.isLegal(move)) break;
    let san: string;
    try {
      san = makeSanAndPlay(pos, move);
    } catch {
      break;
    }
    if (!san || san === '--') break;
    sans.push(san);
  }
  if (sans.length === 0) return null;
  return { sans, moveNumber, startsWithBlack };
}

/** Render a SanLine with move numbers: `26... ♜g8 27. ♖xg8 ♛xg8`.
 *  Figurines by default (Carson) — pass figurines:false for plain SAN. */
export function formatSanLine(line: SanLine, opts: { figurines?: boolean } = {}): string {
  const fig = opts.figurines ?? true;
  const parts: string[] = [];
  let n = line.moveNumber;
  let blacksTurn = line.startsWithBlack;
  for (let i = 0; i < line.sans.length; i++) {
    const san = fig ? figurine(line.sans[i], !blacksTurn) : line.sans[i];
    if (blacksTurn) {
      parts.push(i === 0 ? `${n}... ${san}` : san);
      n++;
    } else {
      parts.push(`${n}. ${san}`);
    }
    blacksTurn = !blacksTurn;
  }
  return parts.join(' ');
}

/**
 * An engine score in White's perspective, the convention every engine
 * GUI uses. UCI reports from the side to move, so a Black-to-move
 * position needs the sign flipped.
 */
export function evalWhitePov(
  scoreCp: number | null,
  scoreMate: number | null,
  whiteToMove: boolean,
): { cp: number | null; mate: number | null } {
  const flip = whiteToMove ? 1 : -1;
  return {
    cp: scoreCp === null ? null : scoreCp * flip,
    mate: scoreMate === null ? null : scoreMate * flip,
  };
}

/** `+0.34`, `-1.20`, `M5`, `-M3`, or `…` while empty. */
export function formatEvalWhitePov(
  scoreCp: number | null,
  scoreMate: number | null,
  whiteToMove: boolean,
): string {
  const { cp, mate } = evalWhitePov(scoreCp, scoreMate, whiteToMove);
  if (mate !== null) return mate > 0 ? `M${mate}` : `-M${Math.abs(mate)}`;
  if (cp === null) return '…';
  const v = cp / 100;
  return (v >= 0 ? '+' : '') + v.toFixed(2);
}

/** Side to move from a FEN — the eval flip must follow the ANALYZED
 *  position, which is the viewed one while browsing history. */
export function whiteToMoveFromFen(fen: string): boolean {
  return fen.split(' ')[1] !== 'b';
}

/**
 * SAN for a queued premove. The move isn't legal yet (it's not our
 * turn), so the position's turn is flipped before rendering — good
 * enough for a label; falls back to null when even that can't parse
 * (impossible interim positions), and the caller shows from→to.
 */
export function premoveSan(fen: string, from: string, to: string): string | null {
  const setup = parseFen(fen);
  if (setup.isErr) return null;
  const flipped = setup.unwrap();
  flipped.turn = flipped.turn === 'white' ? 'black' : 'white';
  flipped.epSquare = undefined;
  const posR = Chess.fromSetup(flipped);
  if (posR.isErr) return null;
  const pos = posR.unwrap();
  const move = parseUci(from + to);
  if (!move || !pos.isLegal(move)) return null;
  try {
    return makeSanAndPlay(pos, move);
  } catch {
    return null;
  }
}

/** Unicode figurines, per mover — ♘f3 for white, ♞f6 for black
 *  (Carson, Chess Ascent habit). Castling and pawn moves untouched
 *  except promotion pieces. */
const FIG_WHITE: Record<string, string> = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘' };
const FIG_BLACK: Record<string, string> = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞' };

export function figurine(san: string, whiteMover: boolean): string {
  const table = whiteMover ? FIG_WHITE : FIG_BLACK;
  return san
    .replace(/^([KQRBN])/, (_, p: string) => table[p])
    .replace(/=([QRBN])/, (_, p: string) => '=' + table[p]);
}

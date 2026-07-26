/**
 * Small algebraic / coordinate helpers shared between the board UI and
 * anyone that needs to translate between (rank, file) indexes and FICS
 * square notation. Keeping these in shared avoids reinventing them in
 * every consumer.
 */

/** Piece integer codes parity with Style12/Raptor GameConstants. */
export const Piece = {
  EMPTY: 0,
  WP: 1, WB: 2, WN: 3, WR: 4, WQ: 5, WK: 6,
  BP: 7, BB: 8, BN: 9, BR: 10, BQ: 11, BK: 12,
} as const;

/** FEN character for each piece code (uppercase=white, lowercase=black). */
const PIECE_FEN_CHAR: Record<number, string> = {
  0: '',
  1: 'P', 2: 'B', 3: 'N', 4: 'R', 5: 'Q', 6: 'K',
  7: 'p', 8: 'b', 9: 'n', 10: 'r', 11: 'q', 12: 'k',
};

/** True if the piece code is a white piece (1..6). */
export function isWhitePiece(code: number): boolean {
  return code >= 1 && code <= 6;
}

/** True if the piece code is a black piece (7..12). */
export function isBlackPiece(code: number): boolean {
  return code >= 7 && code <= 12;
}

/** True if the code is a pawn (white or black). */
export function isPawn(code: number): boolean {
  return code === Piece.WP || code === Piece.BP;
}

/** True if the code is a king (white or black). */
export function isKing(code: number): boolean {
  return code === Piece.WK || code === Piece.BK;
}

/**
 * Convert (rank 0-7, file 0-7) — where rank 0 = white's back rank (1) —
 * into algebraic notation like "e2".
 */
export function squareName(rank: number, file: number): string {
  if (rank < 0 || rank > 7 || file < 0 || file > 7) {
    throw new Error(`out-of-bounds square: rank=${rank} file=${file}`);
  }
  return String.fromCharCode(97 + file) + (rank + 1);
}

/** Parse "e2" → { rank: 1, file: 4 }. Returns null if malformed. */
export function parseSquare(s: string): { rank: number; file: number } | null {
  if (s.length !== 2) return null;
  const file = s.charCodeAt(0) - 97;
  const rank = s.charCodeAt(1) - 49;
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return { rank, file };
}

/**
 * Convert a Style12-style position grid + turn/castling info into a
 * Forsyth–Edwards Notation string suitable for feeding to UCI engines.
 *
 * Style12 encodes position as `position[rank][file]`, where
 * `position[0]` is white's back rank (rank 1) and `position[7]` is
 * black's (rank 8) — matching Raptor's `parsePosition` convention.
 * FEN writes ranks from 8 down to 1, with each rank left-to-right.
 */
export interface Style12FenInput {
  position: readonly (readonly number[])[];
  isWhitesMoveAfterMoveIsMade: boolean;
  canWhiteCastleKSide: boolean;
  canWhiteCastleQSide: boolean;
  canBlackCastleKSide: boolean;
  canBlackCastleQSide: boolean;
  doublePawnPushFile: number;
  numberOfMovesSinceLastIrreversible: number;
  fullMoveNumber: number;
}

export function style12ToFen(s: Style12FenInput): string {
  // Ranks from 8 (index 7) to 1 (index 0).
  const ranks: string[] = [];
  for (let r = 7; r >= 0; r--) {
    let rankStr = '';
    let emptyRun = 0;
    for (let f = 0; f < 8; f++) {
      const code = s.position[r]?.[f] ?? 0;
      if (code === 0) {
        emptyRun++;
      } else {
        if (emptyRun > 0) {
          rankStr += emptyRun.toString();
          emptyRun = 0;
        }
        rankStr += PIECE_FEN_CHAR[code] ?? '?';
      }
    }
    if (emptyRun > 0) rankStr += emptyRun.toString();
    ranks.push(rankStr);
  }

  const turn = s.isWhitesMoveAfterMoveIsMade ? 'w' : 'b';

  let castling = '';
  if (s.canWhiteCastleKSide) castling += 'K';
  if (s.canWhiteCastleQSide) castling += 'Q';
  if (s.canBlackCastleKSide) castling += 'k';
  if (s.canBlackCastleQSide) castling += 'q';
  if (castling === '') castling = '-';

  // doublePawnPushFile: -1 = none. Otherwise the file of a pawn that just
  // double-pushed; en passant target square is on rank 3 (if white moved)
  // or rank 6 (if black moved). Since `isWhitesMoveAfterMoveIsMade` is
  // the turn AFTER the move, a white double-push means it's now black's
  // turn and the e.p. square is rank 3; vice versa for black → rank 6.
  let enPassant = '-';
  if (s.doublePawnPushFile >= 0 && s.doublePawnPushFile <= 7) {
    const fileChar = String.fromCharCode(97 + s.doublePawnPushFile);
    // If it's now black's turn, white just moved → e.p. on rank 3.
    enPassant = fileChar + (s.isWhitesMoveAfterMoveIsMade ? '6' : '3');
  }

  return `${ranks.join('/')} ${turn} ${castling} ${enPassant} ${s.numberOfMovesSinceLastIrreversible} ${s.fullMoveNumber}`;
}

/**
 * Extract `{from, to}` from a Style12 LAN field like "P/e2-e4" or
 * "N/b1-c3". Returns null for "none" / "o-o" / "o-o-o" / malformed.
 * Castling is returned as its king-move coordinates ("e1g1" etc).
 */
export function parseLanMove(
  lan: string,
): { from: string; to: string; piece: string } | null {
  if (!lan || lan === 'none') return null;
  if (lan === 'o-o' || lan === 'O-O') return { from: 'e1', to: 'g1', piece: 'K' };
  if (lan === 'o-o-o' || lan === 'O-O-O') return { from: 'e1', to: 'c1', piece: 'K' };
  // Standard format: "P/e2-e4"
  const m = /^([PNBRQK])\/([a-h][1-8])-([a-h][1-8])/.exec(lan);
  if (!m) return null;
  return { piece: m[1], from: m[2], to: m[3] };
}

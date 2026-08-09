import { describe, it, expect } from 'vitest';
import { squareName, parseSquare, parseLanMove, lastMoveSquares, isWhitePiece, isBlackPiece, isKing, style12ToFen, Piece } from '../chessAlg.js';

describe('chessAlg', () => {
  it('squareName converts rank/file to algebraic', () => {
    expect(squareName(0, 0)).toBe('a1');
    expect(squareName(0, 4)).toBe('e1');
    expect(squareName(1, 4)).toBe('e2');
    expect(squareName(7, 7)).toBe('h8');
  });

  it('parseSquare round-trips', () => {
    for (const sq of ['a1', 'e4', 'h8', 'd5']) {
      const parsed = parseSquare(sq)!;
      expect(squareName(parsed.rank, parsed.file)).toBe(sq);
    }
    expect(parseSquare('z9')).toBeNull();
    expect(parseSquare('e')).toBeNull();
  });

  it('parseLanMove handles standard moves', () => {
    expect(parseLanMove('P/e2-e4', true)).toEqual({ from: 'e2', to: 'e4', piece: 'P' });
    expect(parseLanMove('N/b1-c3', true)).toEqual({ from: 'b1', to: 'c3', piece: 'N' });
  });

  it('parseLanMove handles "none"', () => {
    expect(parseLanMove('none', true)).toBeNull();
    expect(parseLanMove('', true)).toBeNull();
  });

  it('parseLanMove handles castling', () => {
    expect(parseLanMove('o-o', true)).toEqual({ from: 'e1', to: 'g1', piece: 'K' });
    expect(parseLanMove('o-o-o', true)).toEqual({ from: 'e1', to: 'c1', piece: 'K' });
  });

  // FICS writes both castles as `o-o`/`o-o-o` with no colour in the field, so
  // the mover's colour is the only thing that puts them on the right rank.
  // Getting this wrong highlighted white's back rank when black castled.
  it('parseLanMove puts black castling on the eighth rank', () => {
    expect(parseLanMove('o-o', false)).toEqual({ from: 'e8', to: 'g8', piece: 'K' });
    expect(parseLanMove('o-o-o', false)).toEqual({ from: 'e8', to: 'c8', piece: 'K' });
  });

  it('parseLanMove accepts the uppercase castling forms for either colour', () => {
    expect(parseLanMove('O-O', true)).toEqual({ from: 'e1', to: 'g1', piece: 'K' });
    expect(parseLanMove('O-O-O', false)).toEqual({ from: 'e8', to: 'c8', piece: 'K' });
  });

  it('parseLanMove ignores the mover colour for ordinary moves', () => {
    // Only castling has no rank of its own; everything else carries both
    // squares, so the flag must not be able to move them.
    expect(parseLanMove('P/e7-e5', true)).toEqual(parseLanMove('P/e7-e5', false));
    expect(parseLanMove('P/e7-e5', true)).toEqual({ from: 'e7', to: 'e5', piece: 'P' });
  });

  it('parseLanMove returns the squares of a promotion, without the new piece', () => {
    // "P/e7-e8=Q" — the regex is unanchored on purpose so the from/to
    // survive; the promoted piece is not reported and the board does not
    // need it, since the position it paints comes from the grid.
    expect(parseLanMove('P/e7-e8=Q', true)).toEqual({ from: 'e7', to: 'e8', piece: 'P' });
    expect(parseLanMove('P/b2-a1=N', false)).toEqual({ from: 'b2', to: 'a1', piece: 'P' });
  });

  it('parseLanMove rejects malformed fields', () => {
    expect(parseLanMove('e2-e4', true)).toBeNull();
    expect(parseLanMove('P/e2e4', true)).toBeNull();
    expect(parseLanMove('X/e2-e4', true)).toBeNull();
    expect(parseLanMove('P/e9-e4', true)).toBeNull();
  });

  describe('lastMoveSquares', () => {
    // `isWhitesMoveAfterMoveIsMade` is the turn AFTER the move, so the side
    // that moved is the other one. Passing the flag straight through is the
    // mistake this function exists to make impossible.
    it('reads white as the mover when it is now black to move', () => {
      expect(lastMoveSquares({ lan: 'o-o', isWhitesMoveAfterMoveIsMade: false }))
        .toEqual({ from: 'e1', to: 'g1', piece: 'K' });
      expect(lastMoveSquares({ lan: 'o-o-o', isWhitesMoveAfterMoveIsMade: false }))
        .toEqual({ from: 'e1', to: 'c1', piece: 'K' });
    });

    it('reads black as the mover when it is now white to move', () => {
      expect(lastMoveSquares({ lan: 'o-o', isWhitesMoveAfterMoveIsMade: true }))
        .toEqual({ from: 'e8', to: 'g8', piece: 'K' });
      expect(lastMoveSquares({ lan: 'o-o-o', isWhitesMoveAfterMoveIsMade: true }))
        .toEqual({ from: 'e8', to: 'c8', piece: 'K' });
    });

    it('passes ordinary moves and "none" straight through', () => {
      expect(lastMoveSquares({ lan: 'N/g8-f6', isWhitesMoveAfterMoveIsMade: true }))
        .toEqual({ from: 'g8', to: 'f6', piece: 'N' });
      expect(lastMoveSquares({ lan: 'none', isWhitesMoveAfterMoveIsMade: true }))
        .toBeNull();
    });
  });

  it('piece predicates', () => {
    expect(isWhitePiece(1)).toBe(true);
    expect(isWhitePiece(6)).toBe(true);
    expect(isWhitePiece(7)).toBe(false);
    expect(isBlackPiece(7)).toBe(true);
    expect(isBlackPiece(12)).toBe(true);
    expect(isBlackPiece(1)).toBe(false);
    expect(isKing(6)).toBe(true);
    expect(isKing(12)).toBe(true);
    expect(isKing(1)).toBe(false);
  });

  describe('style12ToFen', () => {
    // Build a position like it comes from Style12Parser: position[0]=rank 1.
    function emptyPosition(): number[][] {
      return Array.from({ length: 8 }, () => Array<number>(8).fill(Piece.EMPTY));
    }
    function startingPosition(): number[][] {
      const p = emptyPosition();
      // Rank 1 (white back rank), Style12 position[0]
      p[0] = [Piece.WR, Piece.WN, Piece.WB, Piece.WQ, Piece.WK, Piece.WB, Piece.WN, Piece.WR];
      // Rank 2 (white pawns)
      p[1] = Array<number>(8).fill(Piece.WP);
      // Rank 7 (black pawns)
      p[6] = Array<number>(8).fill(Piece.BP);
      // Rank 8 (black back rank)
      p[7] = [Piece.BR, Piece.BN, Piece.BB, Piece.BQ, Piece.BK, Piece.BB, Piece.BN, Piece.BR];
      return p;
    }

    it('produces the canonical starting FEN', () => {
      const fen = style12ToFen({
        position: startingPosition(),
        isWhitesMoveAfterMoveIsMade: true,
        canWhiteCastleKSide: true,
        canWhiteCastleQSide: true,
        canBlackCastleKSide: true,
        canBlackCastleQSide: true,
        doublePawnPushFile: -1,
        numberOfMovesSinceLastIrreversible: 0,
        fullMoveNumber: 1,
      });
      expect(fen).toBe(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      );
    });

    it('encodes e4 with en-passant target', () => {
      const p = startingPosition();
      // Move white e2 pawn to e4.
      p[1][4] = Piece.EMPTY;
      p[3][4] = Piece.WP;
      const fen = style12ToFen({
        position: p,
        // It's black's turn after white played e4.
        isWhitesMoveAfterMoveIsMade: false,
        canWhiteCastleKSide: true,
        canWhiteCastleQSide: true,
        canBlackCastleKSide: true,
        canBlackCastleQSide: true,
        doublePawnPushFile: 4, // e-file
        numberOfMovesSinceLastIrreversible: 0,
        fullMoveNumber: 1,
      });
      expect(fen).toBe(
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      );
    });

    it('encodes no castling rights as `-`', () => {
      const fen = style12ToFen({
        position: startingPosition(),
        isWhitesMoveAfterMoveIsMade: true,
        canWhiteCastleKSide: false,
        canWhiteCastleQSide: false,
        canBlackCastleKSide: false,
        canBlackCastleQSide: false,
        doublePawnPushFile: -1,
        numberOfMovesSinceLastIrreversible: 42,
        fullMoveNumber: 30,
      });
      expect(fen).toMatch(/ w - - 42 30$/);
    });

    it('black to move flips the turn letter', () => {
      const fen = style12ToFen({
        position: startingPosition(),
        isWhitesMoveAfterMoveIsMade: false,
        canWhiteCastleKSide: true,
        canWhiteCastleQSide: true,
        canBlackCastleKSide: true,
        canBlackCastleQSide: true,
        doublePawnPushFile: -1,
        numberOfMovesSinceLastIrreversible: 0,
        fullMoveNumber: 1,
      });
      expect(fen).toContain(' b KQkq ');
    });
  });
});

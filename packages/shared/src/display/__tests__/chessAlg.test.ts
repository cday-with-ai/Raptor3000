import { describe, it, expect } from 'vitest';
import { squareName, parseSquare, parseLanMove, isWhitePiece, isBlackPiece, isKing, style12ToFen, Piece } from '../chessAlg.js';

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
    expect(parseLanMove('P/e2-e4')).toEqual({ from: 'e2', to: 'e4', piece: 'P' });
    expect(parseLanMove('N/b1-c3')).toEqual({ from: 'b1', to: 'c3', piece: 'N' });
  });

  it('parseLanMove handles "none"', () => {
    expect(parseLanMove('none')).toBeNull();
    expect(parseLanMove('')).toBeNull();
  });

  it('parseLanMove handles castling', () => {
    expect(parseLanMove('o-o')).toEqual({ from: 'e1', to: 'g1', piece: 'K' });
    expect(parseLanMove('o-o-o')).toEqual({ from: 'e1', to: 'c1', piece: 'K' });
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

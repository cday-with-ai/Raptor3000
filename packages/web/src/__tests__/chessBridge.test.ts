import { describe, it, expect } from 'vitest';
import {
  evalWhitePov,
  figurine,
  premoveSan,
  formatEvalWhitePov,
  formatSanLine,
  pvToSan,
  replaySans,
} from '../game/chessBridge.js';

/**
 * The chessops bridge (2026-08-12): SAN replay for the clickable move
 * list, UCI→SAN for engine lines, and the white-perspective eval
 * convention. Standard chess only, failing soft on anything else.
 */

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('replaySans', () => {
  it('replays a SAN list into per-ply grids, start included', () => {
    const { grids } = replaySans(['e4', 'e5', 'Nf3']);
    expect(grids).toHaveLength(4); // start + 3 plies
    // Style12 codes: wP=1 at e2 (rank 1, file 4) initially…
    expect(grids[0][1][4]).toBe(1);
    // …and on e4 (rank 3) after ply 1.
    expect(grids[1][1][4]).toBe(0);
    expect(grids[1][3][4]).toBe(1);
    // wN=3 lands on f3 (rank 2, file 5) after ply 3.
    expect(grids[3][2][5]).toBe(3);
  });

  it('handles castling and captures', () => {
    const { grids } = replaySans(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'O-O']);
    const after = grids[7];
    expect(after[0][6]).toBe(6); // wK on g1
    expect(after[0][5]).toBe(4); // wR on f1
  });

  it('stops at the first unparseable move and keeps the prefix', () => {
    const { grids } = replaySans(['e4', 'Qxh9', 'e5']);
    expect(grids).toHaveLength(2); // start + e4 only
  });
});

describe('pvToSan', () => {
  it('converts a UCI pv to SAN from the given position', () => {
    const line = pvToSan(START_FEN, ['e2e4', 'e7e5', 'g1f3']);
    expect(line?.sans).toEqual(['e4', 'e5', 'Nf3']);
    expect(line?.moveNumber).toBe(1);
    expect(line?.startsWithBlack).toBe(false);
  });

  it('knows when the line starts with a black move', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    const line = pvToSan(fen, ['e7e5', 'g1f3']);
    expect(line?.sans[0]).toBe('e5');
    expect(line?.startsWithBlack).toBe(true);
  });

  it('returns null on a bad fen or empty conversion', () => {
    expect(pvToSan('not a fen', ['e2e4'])).toBeNull();
    expect(pvToSan(START_FEN, ['e2e5'])).toBeNull(); // illegal
  });
});

describe('formatSanLine', () => {
  it('numbers a white-first line', () => {
    expect(
      formatSanLine({ sans: ['e4', 'e5', 'Nf3'], moveNumber: 1, startsWithBlack: false }),
    ).toBe('1. e4 e5 2. Nf3');
  });

  it("numbers a black-first line with the ellipsis convention", () => {
    expect(
      formatSanLine({ sans: ['Rg8', 'Rxg8', 'Qxg8'], moveNumber: 26, startsWithBlack: true }),
    ).toBe('26... Rg8 27. Rxg8 Qxg8');
  });
});

describe('white-perspective eval', () => {
  it('passes through when white is to move', () => {
    expect(evalWhitePov(34, null, true)).toEqual({ cp: 34, mate: null });
    expect(formatEvalWhitePov(34, null, true)).toBe('+0.34');
  });

  it('flips sign when black is to move — UCI is side-to-move', () => {
    expect(evalWhitePov(34, null, false)).toEqual({ cp: -34, mate: null });
    expect(formatEvalWhitePov(120, null, false)).toBe('-1.20');
    expect(formatEvalWhitePov(null, 3, false)).toBe('-M3');
    expect(formatEvalWhitePov(null, -2, false)).toBe('M2');
  });

  it('renders the empty state', () => {
    expect(formatEvalWhitePov(null, null, true)).toBe('…');
  });
});

describe('premoveSan (2026-08-12)', () => {
  const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
  it('renders a queued white premove in SAN by flipping the turn', () => {
    expect(premoveSan(AFTER_E4, 'g1', 'f3')).toBe('Nf3');
    expect(premoveSan(AFTER_E4, 'd2', 'd4')).toBe('d4');
  });
  it('returns null for a premove that is not even flip-legal', () => {
    expect(premoveSan(AFTER_E4, 'a1', 'h8')).toBeNull();
  });
});

describe('figurines (2026-08-12)', () => {
  it('replaces piece letters per mover, including promotions', () => {
    expect(figurine('Nf3', true)).toBe('♘f3');
    expect(figurine('Nf6', false)).toBe('♞f6');
    expect(figurine('e8=Q+', true)).toBe('e8=♕+');
    expect(figurine('O-O', true)).toBe('O-O');
    expect(figurine('exd5', false)).toBe('exd5');
  });

  it('formatSanLine figurines by default, plain on request', () => {
    const line = { sans: ['Nf3', 'Nc6'], moveNumber: 2, startsWithBlack: false };
    expect(formatSanLine(line)).toBe('2. ♘f3 ♞c6');
    expect(formatSanLine(line, { figurines: false })).toBe('2. Nf3 Nc6');
  });
});

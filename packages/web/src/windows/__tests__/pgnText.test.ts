import { describe, expect, it } from 'vitest';
import {
  buildPgnText,
  pgnResult,
  pgnTermination,
  variantFor,
  wrapPgnMoves,
} from '../pgnText.js';
import { GameEndType, type GameEndMessage } from '@raptor3000/shared';
import type { RaptorContext } from '../appContext.js';

/**
 * The builder is shared by the Save PGN button and the auto-append
 * journal (2026-08-16), so these tests pin the extracted text shape:
 * lichess-style headers, the PGN result tokens, the Termination
 * vocabulary, the FICS→lichess variant names and the 75-char wrapping.
 * Extracted verbatim from BoardWindow — these tests are the receipt
 * that the move changed nothing.
 */

function ge(overrides: Partial<GameEndMessage>): GameEndMessage {
  return {
    type: GameEndType.WHITE_WON,
    description: 'White mates',
    ...overrides,
  } as GameEndMessage;
}

const fakeService = {
  getLatestG1: () => undefined,
  getLatestMoves: () => undefined,
};

function ctx(): RaptorContext {
  return { gameService: fakeService } as unknown as RaptorContext;
}

describe('pgnResult', () => {
  it('maps the three verdicts to PGN tokens', () => {
    expect(pgnResult(ge({ type: GameEndType.WHITE_WON }))).toBe('1-0');
    expect(pgnResult(ge({ type: GameEndType.BLACK_WON }))).toBe('0-1');
    expect(pgnResult(ge({ type: GameEndType.DRAW }))).toBe('1/2-1/2');
    expect(pgnResult(ge({ type: GameEndType.ABORTED }))).toBe('*');
    expect(pgnResult(null)).toBe('*');
  });
});

describe('pgnTermination', () => {
  const cases: [string, string][] = [
    ['Black mates', 'checkmate'],
    ['Checkmate: White mates', 'checkmate'],
    ['White wins by stalemate', 'stalemate'],
    ['Black resigns', 'resignation'],
    ['White forfeits on time', 'time forfeit'],
    ['Game drawn by repetition', 'repetition'],
    ['Game drawn by insufficient material', 'insufficient material'],
    ['Draw by mutual agreement', 'agreement'],
    ['Draw by the 50 move rule', '50 move rule'],
    ['Odd ending nobody predicted', 'normal'],
  ];
  it.each(cases)('turns %s into %s', (desc, expected) => {
    expect(pgnTermination(ge({ type: GameEndType.DRAW, description: desc }))).toBe(expected);
  });
  it('handles the special types directly', () => {
    expect(pgnTermination(ge({ type: GameEndType.ABORTED, description: 'x' }))).toBe('abandoned');
    expect(pgnTermination(ge({ type: GameEndType.ADJOURNED, description: 'x' }))).toBe('adjourned');
  });
});

describe('variantFor', () => {
  const cases: [string | undefined, string | null][] = [
    ['standard', null],
    ['blitz', null],
    [undefined, null],
    ['wild/fr', 'Chess960'],
    ['wild/0', 'Crazyhouse'],
    ['wild/1', 'Antichess'],
    ['wild/2', 'Antichess'],
    ['wild/3', 'Antichess'],
    ['wild/4', 'Atomic'],
    ['suicide', 'Antichess'],
    ['atomic', 'Atomic'],
    ['bughouse', 'Bughouse'],
  ];
  it.each(cases)('%s → %s', (type, expected) => {
    expect(variantFor(type)).toBe(expected);
  });
});

describe('wrapPgnMoves', () => {
  it('keeps a short game on one line', () => {
    expect(wrapPgnMoves(['1.', 'e4', 'e5', '2.', 'Nf3', 'Nc6', '1-0'])).toBe('1. e4 e5 2. Nf3 Nc6 1-0');
  });
  it('breaks long games at 75 chars', () => {
    const tokens = [
      '1.', 'e4', 'e5', '2.', 'Nf3', 'Nc6', '3.', 'Bb5', 'a6', '4.', 'Ba4', 'Nf6',
      '5.', 'O-O', 'Be7', '6.', 'Re1', 'b5', '7.', 'Bb3', 'd6', '8.', 'c3', 'O-O',
    ];
    const out = wrapPgnMoves(tokens);
    for (const line of out.split('\n')) expect(line.length).toBeLessThanOrEqual(75);
    expect(out.split('\n').length).toBeGreaterThan(1);
  });
  it('never leaves a move number dangling at a line end', () => {
    const tokens: string[] = [];
    for (let p = 1; p <= 40; p++) {
      if (p % 2 === 1) tokens.push(`${(p + 1) / 2}.`);
      tokens.push('Nf3');
    }
    tokens.push('1-0');
    const out = wrapPgnMoves(tokens);
    for (const line of out.split('\n')) {
      expect(line.trim().match(/^\d+\.$/)).toBeNull();
    }
  });
});

describe('buildPgnText', () => {
  it('writes lichess-style headers and the movetext with the result', () => {
    const pgn = buildPgnText({
      context: ctx(),
      gameId: '7',
      s12: {
        whiteName: 'WhiteGuy',
        blackName: 'BlackGuy',
        initialTimeMillis: 300000,
        initialIncMillis: 0,
      } as never,
      sans: new Map([[1, 'e4'], [2, 'e5'], [3, 'Nf3'], [4, 'Nc6']]),
      gameEnd: ge({ type: GameEndType.BLACK_WON, description: 'White resigns' }),
      opening: { eco: 'C50', name: 'Italian Game', plies: 3 },
      whiteRating: '1586',
      blackRating: '2100',
    });

    expect(pgn).toContain('[Event "Online Game"]');
    expect(pgn).toContain('[Site "https://freechess.org"]');
    expect(pgn).toContain('[White "WhiteGuy"]');
    expect(pgn).toContain('[Black "BlackGuy"]');
    expect(pgn).toContain('[Result "0-1"]');
    expect(pgn).toContain('[TimeControl "300+0"]');
    expect(pgn).toContain('[WhiteElo "1586"]');
    expect(pgn).toContain('[BlackElo "2100"]');
    expect(pgn).toContain('[Opening "Italian Game"]');
    expect(pgn).toContain('[ECO "C50"]');
    expect(pgn).toContain('[Termination "resignation"]');
    expect(pgn).toContain('1. e4 e5 2. Nf3 Nc6 0-1');
  });

  it('omits the variant tag for a standard game', () => {
    const pgn = buildPgnText({
      context: ctx(),
      gameId: null,
      s12: { whiteName: 'A', blackName: 'B' } as never,
      sans: new Map(),
      gameEnd: null,
      opening: null,
      whiteRating: '',
      blackRating: '',
    });
    expect(pgn).not.toContain('[Variant ');
  });

  it('adds the variant tag for a wild game', () => {
    const pgn = buildPgnText({
      context: {
        gameService: {
          getLatestG1: () => ({ gameTypeDescription: 'wild/4' }),
          getLatestMoves: () => undefined,
        },
      } as unknown as RaptorContext,
      gameId: '3',
      s12: { whiteName: 'A', blackName: 'B' } as never,
      sans: new Map(),
      gameEnd: null,
      opening: null,
      whiteRating: '',
      blackRating: '',
    });
    expect(pgn).toContain('[Variant "Atomic"]');
  });
});
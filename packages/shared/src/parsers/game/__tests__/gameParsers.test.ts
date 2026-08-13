import { describe, it, expect } from 'vitest';
import {
  Style12Parser,
  G1Parser,
  B1Parser,
  GameEndParser,
  IllegalMoveParser,
  NoLongerExaminingGameParser,
  RemovingObsGameParser,
  TakebackParser,
  SoughtParser,
  GameInfoParser,
  MovesParser,
} from '../index.js';
import { GameEndType } from '../../../models/messages/GameEndMessage.js';
import { Style12Relation } from '../../../models/messages/Style12Message.js';
import { GameInfoCategory } from '../../../models/GameInfo.js';
import { SeekColor, SeekType } from '../../../models/Seek.js';

describe('Style12Parser', () => {
  const parser = new Style12Parser();
  const line =
    '<12>rnbqkbnr pppppppp -------- -------- ----P--- -------- PPPP-PPP RNBQKBNR B 4 1 1 1 1 0 100 guestBLARG guestcday 1 10 0 39 39 600 600 1 P/e2-e4 (0:00.000) e4 1 0 0';

  it('returns null for non-Style12 input', () => {
    expect(parser.parse('some other line')).toBeNull();
  });

  it('parses core fields', () => {
    const m = parser.parse(line);
    expect(m).not.toBeNull();
    if (!m) return;
    expect(m.gameId).toBe('100');
    expect(m.whiteName).toBe('guestBLARG');
    expect(m.blackName).toBe('guestcday');
    expect(m.isWhitesMoveAfterMoveIsMade).toBe(false);
    expect(m.doublePawnPushFile).toBe(4);
    expect(m.canWhiteCastleKSide).toBe(true);
    expect(m.canWhiteCastleQSide).toBe(true);
    expect(m.canBlackCastleKSide).toBe(true);
    expect(m.canBlackCastleQSide).toBe(true);
    expect(m.relation).toBe(Style12Relation.PLAYING_MY_MOVE);
    expect(m.whiteRemainingTimeMillis).toBe(600);
    expect(m.fullMoveNumber).toBe(1);
    expect(m.lan).toBe('P/e2-e4');
    expect(m.san).toBe('e4');
    expect(m.timeTakenForLastMoveMillis).toBe(0);
    expect(m.isWhiteOnTop).toBe(true);
    expect(m.isClockTicking).toBe(false);
    expect(m.lagInMillis).toBe(0);
    // ICS time controls are in minutes: 10 min → 600000 ms.
    expect(m.initialTimeMillis).toBe(600000);
  });

  it('places pieces at parity with Raptor position[rank][file]', () => {
    const m = parser.parse(line)!;
    // a1 (rank 0, file 0) = white rook (WR = 4)
    expect(m.position[0][0]).toBe(4);
    // e4 (rank 3, file 4) = WP = 1
    expect(m.position[3][4]).toBe(1);
    // e8 (rank 7, file 4) = BK = 12
    expect(m.position[7][4]).toBe(12);
  });
});

describe('G1Parser', () => {
  const parser = new G1Parser();
  it('parses registered-both case', () => {
    const m = parser.parse(
      '<g1> 1 p=0 t=blitz r=1 u=0,0 it=5,5 i=8,8 pt=0 rt=1586E,2100 ts=1,0',
    );
    expect(m).not.toBeNull();
    if (!m) return;
    expect(m.gameId).toBe('1');
    expect(m.isPrivate).toBe(false);
    expect(m.gameTypeDescription).toBe('blitz');
    expect(m.isRated).toBe(true);
    expect(m.isWhiteRegistered).toBe(true);
    expect(m.isBlackRegistered).toBe(true);
    expect(m.initialWhiteTimeMillis).toBe(5000);
    expect(m.whiteRating).toBe('1586E');
    expect(m.blackRating).toBe('2100');
    expect(m.isWhiteUsingTimeseal).toBe(true);
    expect(m.isBlackUsingTimeseal).toBe(false);
  });

  it('overrides rating for unregistered players', () => {
    const m = parser.parse(
      '<g1> 1 p=0 t=blitz r=1 u=1,1 it=5,5 i=8,8 pt=0 rt=0,0 ts=0,0',
    )!;
    expect(m.whiteRating).toBe('++++');
    expect(m.blackRating).toBe('++++');
    expect(m.isWhiteRegistered).toBe(false);
    expect(m.isBlackRegistered).toBe(false);
  });

  it('returns null for non-G1 input', () => {
    expect(parser.parse('something else')).toBeNull();
  });
});

describe('B1Parser', () => {
  const parser = new B1Parser();
  it('parses holdings', () => {
    const m = parser.parse('<b1> game 6 white [PNBBB] black [PNB]')!;
    expect(m.gameId).toBe('6');
    // index 1=PAWN, 2=BISHOP, 3=KNIGHT
    expect(m.whiteHoldings[1]).toBe(1);
    expect(m.whiteHoldings[2]).toBe(3);
    expect(m.whiteHoldings[3]).toBe(1);
    expect(m.blackHoldings[1]).toBe(1);
    expect(m.blackHoldings[2]).toBe(1);
    expect(m.blackHoldings[3]).toBe(1);
  });

  it('discards the passed-piece annotation', () => {
    const m = parser.parse('<b1> game 7 white [PP] black [Q] <- BN')!;
    expect(m.gameId).toBe('7');
    expect(m.whiteHoldings[1]).toBe(2);
    expect(m.blackHoldings[5]).toBe(1);
  });

  it('handles empty holdings', () => {
    const m = parser.parse('<b1> game 8 white [] black []')!;
    expect(m.whiteHoldings.every(v => v === 0)).toBe(true);
    expect(m.blackHoldings.every(v => v === 0)).toBe(true);
  });
});

describe('GameEndParser', () => {
  const parser = new GameEndParser();
  it('parses a resignation (black wins)', () => {
    const m = parser.parse(
      '{Game 117 (raptora vs. raptorb) raptora resigns} 0-1',
    )!;
    expect(m.gameId).toBe('117');
    expect(m.whiteName).toBe('raptora');
    expect(m.blackName).toBe('raptorb');
    expect(m.description).toBe('raptora resigns');
    expect(m.type).toBe(GameEndType.BLACK_WON);
  });

  it('parses a white-win', () => {
    const m = parser.parse(
      '{Game 5 (A vs. B) B resigns} 1-0',
    )!;
    expect(m.type).toBe(GameEndType.WHITE_WON);
  });

  it('parses a draw', () => {
    const m = parser.parse(
      '{Game 5 (A vs. B) Game drawn by mutual agreement} 1/2-1/2',
    )!;
    expect(m.type).toBe(GameEndType.DRAW);
  });

  it('parses aborted', () => {
    const m = parser.parse(
      '{Game 5 (A vs. B) Game aborted on move 1} *',
    )!;
    expect(m.type).toBe(GameEndType.ABORTED);
  });

  it('parses adjourned', () => {
    const m = parser.parse(
      '{Game 5 (A vs. B) Game adjourned by mutual agreement} *',
    )!;
    expect(m.type).toBe(GameEndType.ADJOURNED);
  });

  it('rejects {Game ... Creating: ...} start-of-game lines', () => {
    expect(
      parser.parse('{Game 5 (A vs. B) Creating: rated blitz 5 0}'),
    ).toBeNull();
  });
});

describe('IllegalMoveParser', () => {
  const parser = new IllegalMoveParser();
  it('extracts the move', () => {
    expect(parser.parse('Illegal move (e4).')!.move).toBe('e4');
  });
  it('returns null for other lines', () => {
    expect(parser.parse('some other line')).toBeNull();
  });
});

describe('NoLongerExaminingGameParser', () => {
  const parser = new NoLongerExaminingGameParser();
  it('extracts gameId', () => {
    expect(
      parser.parse('You are no longer examining game 123.')!.gameId,
    ).toBe('123');
  });
});

describe('RemovingObsGameParser', () => {
  const parser = new RemovingObsGameParser();
  it('extracts gameId', () => {
    expect(
      parser.parse('Removing game 117 from observation list.')!.gameId,
    ).toBe('117');
  });
});

describe('TakebackParser', () => {
  it('buffers a request then flips wasAccepted on accept', () => {
    const parser = new TakebackParser();
    const req = parser.parse(
      'Game 117: raptorb requests to take back 1 half move(s).',
    )!;
    expect(req.gameId).toBe('117');
    expect(req.halfMovesRequested).toBe(1);
    expect(req.wasAccepted).toBe(false);

    const acc = parser.parse(
      'Game 117: raptora accepts the takeback request.',
    )!;
    expect(acc.gameId).toBe('117');
    expect(acc.wasAccepted).toBe(true);
    expect(parser.getTakebackMessage('117')?.wasAccepted).toBe(true);
  });

  it('records accept-with-no-prior-request as halfMovesRequested=-1', () => {
    const parser = new TakebackParser();
    const acc = parser.parse(
      'Game 200: raptorc accepts the takeback request.',
    )!;
    expect(acc.halfMovesRequested).toBe(-1);
    expect(acc.wasAccepted).toBe(true);
  });

  it('returns null for unrelated lines', () => {
    const parser = new TakebackParser();
    expect(parser.parse('GuestA tells you: hi')).toBeNull();
  });
});

describe('SoughtParser', () => {
  const parser = new SoughtParser();
  it('parses a simple seek block', () => {
    const block = [
      ' 12 1500 GuestA        5   0 unrated blitz                 0-9999',
      '  7 1850 GMBob         3   0 rated   blitz  [white]        1700-2200 mf',
      '2 ads displayed.',
    ].join('\n');
    const seeks = parser.parse(block)!;
    expect(seeks).toHaveLength(2);
    const [a, b] = seeks;
    expect(a.ad).toBe('12');
    expect(a.rating).toBe('1500');
    expect(a.name).toBe('GuestA');
    expect(a.minutes).toBe(5);
    expect(a.increment).toBe(0);
    expect(a.rated).toBe(false);
    expect(a.type).toBe(SeekType.BLITZ);
    expect(a.color).toBe(SeekColor.AUTO);
    expect(a.minRating).toBe(0);
    expect(a.maxRating).toBe(9999);

    expect(b.color).toBe(SeekColor.WHITE);
    expect(b.minRating).toBe(1700);
    expect(b.maxRating).toBe(2200);
    expect(b.manual).toBe(true);
    expect(b.formula).toBe(true);
  });

  it('returns null for non-sought chunks', () => {
    expect(parser.parse('not a seek block')).toBeNull();
  });

  it('returns null when the first line is not integer-prefixed', () => {
    const block = ['Something foo', '1 ad displayed.'].join('\n');
    expect(parser.parse(block)).toBeNull();
  });
});

describe('GameInfoParser', () => {
  const parser = new GameInfoParser();
  it('parses a regular and an exam row', () => {
    const block = [
      '158 2007 ventroy     1967 chelou        [ lr  1   0]   0:42 -  0:41 (17-20) W: 20',
      '  5 (Exam.    0 LectureBot    0 A.Zaitzev ) [ uu  0   0] W: 20',
      '2 games displayed.',
    ].join('\n');
    const infos = parser.parse(block)!;
    expect(infos).toHaveLength(2);

    const [reg, ex] = infos;
    expect(reg.id).toBe('158');
    expect(reg.whiteName).toBe('ventroy');
    expect(reg.blackName).toBe('chelou');
    expect(reg.whiteElo).toBe('2007');
    expect(reg.blackElo).toBe('1967');
    expect(reg.category).toBe(GameInfoCategory.LIGHTNING);
    expect(reg.isRated).toBe(true);
    expect(reg.beingExamined).toBe(false);
    expect(reg.whitesMove).toBe(true);
    expect(reg.moveNumber).toBe(20);
    expect(reg.time).toBe(1);
    expect(reg.inc).toBe(0);

    expect(ex.id).toBe('5');
    expect(ex.beingExamined).toBe(true);
    expect(ex.whiteName).toBe('LectureBot');
    expect(ex.blackName).toBe('A.Zaitzev');
    expect(ex.category).toBe(GameInfoCategory.UNTIMED);
    expect(ex.isRated).toBe(false);
  });

  it('returns null when the trailer is missing', () => {
    expect(parser.parse('no trailer here')).toBeNull();
  });
});

describe('MovesParser', () => {
  const parser = new MovesParser();
  it('parses a two-move moves block', () => {
    const block = [
      '',
      'Movelist for game 69:',
      'laikun (2106) vs. zabakov (2021) --- Fri Nov  6, 03:23 PST 2009',
      'Rated wild/fr match, initial time: 3 minutes, increment: 0 seconds.',
      'Move  laikun             zabakov',
      '----  ----------------   ----------------',
      '  1.  g3       (0:00.000)   e5       (0:00.000)',
      '  2.  d3       (0:03.000)   g6       (0:01.000)',
      '       {Still in progress} *',
    ].join('\n');
    const m = parser.parse(block)!;
    expect(m.gameId).toBe('69');
    expect(m.gameType).toBe('wild/fr');
    expect(m.moves).toEqual(['g3', 'e5', 'd3', 'g6']);
    expect(m.timePerMove).toEqual([0, 0, 3000, 1000]);
    expect(m.style12).toBeNull();
  });

  it('returns null for non-moves chunks', () => {
    expect(parser.parse('some other output')).toBeNull();
  });
});

describe('MovesParser ratings (2026-08-12)', () => {
  const parser = new MovesParser();
  const block = (vsLine: string) => [
    '',
    'Movelist for game 69:',
    vsLine,
    'Rated blitz match, initial time: 3 minutes, increment: 0 seconds.',
    'Move  laikun             zabakov',
    '----  ----------------   ----------------',
    '  1.  g3       (0:00.000)   e5       (0:00.000)',
    '       {Still in progress} *',
  ].join('\n');

  it('reads both ratings off the vs line', () => {
    const m = parser.parse(block('laikun (2106) vs. zabakov (2021) --- Fri Nov  6, 03:23 PST 2009'))!;
    expect(m.whiteRating).toBe('2106');
    expect(m.blackRating).toBe('2021');
  });

  it('leaves guests and UNR empty', () => {
    const m = parser.parse(block('GuestABCD (++++) vs. WoodPusher (UNR) --- Tue Aug 12, 2026'))!;
    expect(m.whiteRating).toBe('');
    expect(m.blackRating).toBe('');
  });
});

describe('MovesParser flavor fields (2026-08-12)', () => {
  const parser = new MovesParser();
  const block = (descLine: string) => [
    '',
    'Movelist for game 8:',
    'GuestA (++++) vs. GuestB (++++) --- Tue Aug 12, 2026',
    descLine,
    'Move  GuestA             GuestB',
    '----  ----------------   ----------------',
    '  1.  e4       (0:00.000)   e5       (0:00.000)',
    '       {Still in progress} *',
  ].join('\n');

  it("reads ratedness and clocks — the status line's 'Lightning 1 0 u'", () => {
    const m = parser.parse(block('Unrated lightning match, initial time: 1 minutes, increment: 0 seconds.'))!;
    expect(m.isRated).toBe(false);
    expect(m.initialMinutes).toBe(1);
    expect(m.incrementSeconds).toBe(0);
    const r = parser.parse(block('Rated blitz match, initial time: 3 minutes, increment: 12 seconds.'))!;
    expect(r.isRated).toBe(true);
    expect(r.initialMinutes).toBe(3);
    expect(r.incrementSeconds).toBe(12);
  });
});

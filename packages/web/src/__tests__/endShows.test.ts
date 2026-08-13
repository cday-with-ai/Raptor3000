import { describe, it, expect } from 'vitest';
import { GameEndType, type GameEndMessage } from '@raptor3000/shared';
import {
  END_SHOWS,
  endShowFor,
  kingShowAnimation,
  teamShowAnimation,
} from '../game/endShows.js';
import { gameEndSound } from '../sounds.js';

/**
 * Game-end theater, season two (2026-08-12). Pins: the show pick is
 * deterministic per gameId (every window watching one game agrees),
 * mate-only shows never run without a mate, aborted/adjourned earn no
 * show at all, and the aborted-verdict sound bug stays dead.
 */

function end(type: GameEndMessage['type'], gameId = '42'): GameEndMessage {
  return { gameId, whiteName: 'A', blackName: 'B', type, description: '' };
}

describe('endShowFor', () => {
  it('is deterministic per gameId', () => {
    const a = endShowFor(end(GameEndType.WHITE_WON, '7'), false);
    const b = endShowFor(end(GameEndType.WHITE_WON, '7'), false);
    expect(a).toBe(b);
  });

  it('spreads across the roster as gameIds vary', () => {
    const keys = new Set(
      Array.from({ length: 40 }, (_, i) =>
        endShowFor(end(GameEndType.WHITE_WON, String(i)), true)?.key,
      ),
    );
    expect(keys.size).toBeGreaterThan(1);
  });

  it('never picks a mate-only show without a mate', () => {
    for (let i = 0; i < 40; i++) {
      const show = endShowFor(end(GameEndType.BLACK_WON, String(i)), false);
      expect(show?.requiresMate ?? false).toBe(false);
    }
  });

  it('aborted and adjourned games get no show', () => {
    expect(endShowFor(end(GameEndType.ABORTED), true)).toBeNull();
    expect(endShowFor(end(GameEndType.ADJOURNED), true)).toBeNull();
  });
});

describe('kingShowAnimation', () => {
  const show = END_SHOWS.find(s => s.key === 'boom')!;
  it('gives the loser the explosion and the winner the hop', () => {
    expect(kingShowAnimation(show, end(GameEndType.WHITE_WON), true)).toContain('hop');
    expect(kingShowAnimation(show, end(GameEndType.WHITE_WON), false)).toContain('explode');
    expect(kingShowAnimation(show, end(GameEndType.BLACK_WON), true)).toContain('explode');
  });
  it('draws share the draw animation', () => {
    expect(kingShowAnimation(show, end(GameEndType.DRAW), true)).toBe(show.draw);
    expect(kingShowAnimation(show, end(GameEndType.DRAW), false)).toBe(show.draw);
  });
});

describe('teamShowAnimation', () => {
  const team = END_SHOWS.find(s => s.key === 'team')!;
  const solo = END_SHOWS.find(s => s.key === 'classic')!;
  it('cheers the winning side, droops the losing side', () => {
    expect(teamShowAnimation(team, end(GameEndType.WHITE_WON), true)).toContain('cheer');
    expect(teamShowAnimation(team, end(GameEndType.WHITE_WON), false)).toContain('droop');
    expect(teamShowAnimation(team, end(GameEndType.BLACK_WON), false)).toContain('cheer');
  });
  it('king-only shows and draws animate no team', () => {
    expect(teamShowAnimation(solo, end(GameEndType.WHITE_WON), true)).toBeNull();
    expect(teamShowAnimation(team, end(GameEndType.DRAW), true)).toBeNull();
  });
});

describe('gameEndSound on non-decisive endings (the aborted-Victory bug)', () => {
  it('everyone gets the plain notify — nobody "wins" an abort', () => {
    const aborted = { ...end(GameEndType.ABORTED), whiteName: 'me', blackName: 'you' };
    expect(gameEndSound(aborted, 'me')).toBe('notify');
    expect(gameEndSound(aborted, 'you')).toBe('notify');
    const adjourned = { ...end(GameEndType.ADJOURNED), whiteName: 'me', blackName: 'you' };
    expect(gameEndSound(adjourned, 'me')).toBe('notify');
  });
});

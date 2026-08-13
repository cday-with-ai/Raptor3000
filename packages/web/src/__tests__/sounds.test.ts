import { describe, it, expect } from 'vitest';
import { GameEndType, type GameEndMessage } from '@raptor3000/shared';
import { MOVE_SOUND_SETS, gameEndSound, soundForSan } from '../sounds.js';
import { DEFAULT_PREFERENCES } from '../preferences.js';

/**
 * Board sounds (2026-08-12): the piano set — the only subtle lila set
 * that is actually free (AGPLv3+; the "standard" lichess sounds are in
 * COPYING.md's non-free exceptions). These tests pin the pure mapping
 * layer: which SAN gets which sound, and who hears which verdict.
 */

describe('soundForSan', () => {
  it('classifies moves, captures and checks', () => {
    expect(soundForSan('e4')).toBe('move');
    expect(soundForSan('O-O')).toBe('move');
    expect(soundForSan('exd5')).toBe('capture');
    expect(soundForSan('Nf3+')).toBe('check');
    expect(soundForSan('Qxf7#')).toBe('check'); // check outranks capture
  });

  it('is silent on the no-move sentinel', () => {
    expect(soundForSan('none')).toBeNull();
    expect(soundForSan('')).toBeNull();
  });
});

function end(type: GameEndMessage['type']): GameEndMessage {
  return {
    gameId: '7',
    whiteName: 'GuestABCD',
    blackName: 'cday',
    type,
    description: 'test',
  };
}

describe('gameEndSound', () => {
  it('gives a player their verdict, case-insensitively', () => {
    expect(gameEndSound(end(GameEndType.WHITE_WON), 'guestabcd')).toBe('victory');
    expect(gameEndSound(end(GameEndType.WHITE_WON), 'cday')).toBe('defeat');
    expect(gameEndSound(end(GameEndType.BLACK_WON), 'cday')).toBe('victory');
    expect(gameEndSound(end(GameEndType.DRAW), 'cday')).toBe('draw');
  });

  it('observers and the logged-out get the subtle notify', () => {
    expect(gameEndSound(end(GameEndType.WHITE_WON), 'Bystander')).toBe('notify');
    expect(gameEndSound(end(GameEndType.DRAW), null)).toBe('notify');
  });
});

describe('move sound sets (2026-08-12)', () => {
  it('offers exactly the freely licensed sets, sfx by default', () => {
    expect([...MOVE_SOUND_SETS]).toEqual(['sfx', 'piano', 'futuristic', 'nes']);
    expect(DEFAULT_PREFERENCES.moveSoundSet).toBe('sfx');
  });
});

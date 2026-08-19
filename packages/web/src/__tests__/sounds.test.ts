import { describe, it, expect } from 'vitest';
import { GameEndType, type GameEndMessage } from '@raptor3000/shared';
import { MOVE_SOUND_SETS, gameEndSound, setForSound, soundForSan } from '../sounds.js';
import { DEFAULT_PREFERENCES } from '../preferences.js';

/**
 * Board sounds: SAN → sample, who hears which verdict, and which
 * folder a preference actually plays from. The original palettes carry
 * their own endings; the move-only lichess leftovers still fall back
 * to piano for those.
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

describe('move sound sets (2026-08-12, originals 2026-08-18)', () => {
  it('offers the original palettes first, then the lichess leftovers, felt by default', () => {
    expect([...MOVE_SOUND_SETS]).toEqual([
      'felt', 'walnut', 'marble', 'clock', 'study', 'slate',
      'sfx', 'piano', 'futuristic', 'nes',
    ]);
    expect(DEFAULT_PREFERENCES.moveSoundSet).toBe('felt');
  });

  it('a full palette plays its own endings; a move-only leftover falls back to piano', () => {
    expect(setForSound('move', 'felt')).toBe('felt');
    expect(setForSound('victory', 'felt')).toBe('felt');
    expect(setForSound('explosion', 'slate')).toBe('slate');
    expect(setForSound('notify', 'piano')).toBe('piano');
    expect(setForSound('move', 'sfx')).toBe('sfx');
    expect(setForSound('victory', 'sfx')).toBe('piano');
    expect(setForSound('defeat', 'nes')).toBe('piano');
    expect(setForSound('draw', 'futuristic')).toBe('piano');
  });
});

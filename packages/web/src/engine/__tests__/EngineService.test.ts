import { describe, it, expect } from 'vitest';
import { parseUciInfo } from '../EngineService.js';

describe('parseUciInfo', () => {
  it('parses centipawn score and PV', () => {
    const line =
      'info depth 12 seldepth 18 multipv 1 score cp 27 nodes 12345 nps 67890 pv e2e4 e7e5 g1f3';
    const info = parseUciInfo(line)!;
    expect(info.depth).toBe(12);
    expect(info.scoreCp).toBe(27);
    expect(info.scoreMate).toBeNull();
    expect(info.pv).toEqual(['e2e4', 'e7e5', 'g1f3']);
    expect(info.multipv).toBe(1);
    expect(info.nps).toBe(67890);
  });

  it('parses mate scores', () => {
    const line = 'info depth 6 score mate 3 nodes 1000 nps 500000 pv f6f7 e8d8 d1d8';
    const info = parseUciInfo(line)!;
    expect(info.scoreMate).toBe(3);
    expect(info.scoreCp).toBeNull();
    expect(info.pv[0]).toBe('f6f7');
  });

  it('parses negative mate (getting mated)', () => {
    const line = 'info depth 8 score mate -2 pv h8h1 e1e2';
    const info = parseUciInfo(line)!;
    expect(info.scoreMate).toBe(-2);
  });

  it('skips info lines without depth/score/pv', () => {
    expect(parseUciInfo('info string Detected 8 cores')).toBeNull();
    expect(parseUciInfo('info hashfull 200 nodes 12345')).toBeNull();
    expect(parseUciInfo('readyok')).toBeNull();
  });

  it('handles missing PV (score-only update)', () => {
    const line = 'info depth 14 score cp -45 nodes 99999 nps 1000000';
    const info = parseUciInfo(line)!;
    expect(info.depth).toBe(14);
    expect(info.scoreCp).toBe(-45);
    expect(info.pv).toEqual([]);
  });
});

describe('multipv parsing', () => {
  it('reads the multipv rank and defaults it to 1', () => {
    const l2 =
      'info depth 12 multipv 2 score cp -15 nodes 999 nps 100 pv d2d4 d7d5';
    expect(parseUciInfo(l2)!.multipv).toBe(2);
    const noRank = 'info depth 10 score cp 5 pv e2e4';
    expect(parseUciInfo(noRank)!.multipv).toBe(1);
  });
});

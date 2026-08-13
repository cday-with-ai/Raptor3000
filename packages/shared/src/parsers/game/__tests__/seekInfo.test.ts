import { describe, it, expect } from 'vitest';
import { SeekInfoParser } from '../SeekInfoParser.js';
import { SeekColor, SeekType } from '../../../models/Seek.js';

/**
 * The seekinfo stream (2026-08-13): <s> adds, <sr> removes, <sc>
 * clears. Line shapes from FICS `help iv_seekinfo` and live capture.
 */
const parser = new SeekInfoParser();

describe('parseAdd', () => {
  it('parses a full <s> line', () => {
    const s = parser.parseAdd(
      '<s> 45 w=GriffyJr ti=02 rt=1927  t=2 i=12 r=r tp=blitz c=W rr=1300-2100 a=t f=t',
    )!;
    expect(s.ad).toBe('45');
    expect(s.name).toBe('GriffyJr');
    expect(s.rating).toBe('1927');
    expect(s.minutes).toBe(2);
    expect(s.increment).toBe(12);
    expect(s.rated).toBe(true);
    expect(s.type).toBe(SeekType.BLITZ);
    expect(s.color).toBe(SeekColor.WHITE);
    expect(s.minRating).toBe(1300);
    expect(s.maxRating).toBe(2100);
    expect(s.manual).toBe(false);
    expect(s.formula).toBe(true);
  });

  it('guest defaults: rt=0 shows ----, a=f is manual, wilds map', () => {
    const s = parser.parseAdd(
      '<s> 9 w=GuestHELL ti=01 rt=0P t=7 i=0 r=u tp=wild/fr c=? rr=0-9999 a=f f=f',
    )!;
    expect(s.rating).toBe('----');
    expect(s.manual).toBe(true);
    expect(s.type).toBe(SeekType.FISCHER_RANDOM);
    expect(s.color).toBe(SeekColor.AUTO);
  });

  it('rejects non-<s> lines', () => {
    expect(parser.parseAdd('<sr> 45')).toBeNull();
    expect(parser.parseAdd('GuestX seeking 5 0')).toBeNull();
  });
});

describe('parseRemove / isClear', () => {
  it('reads every ad from an <sr>', () => {
    expect(parser.parseRemove('<sr> 12 34 56')).toEqual(['12', '34', '56']);
    expect(parser.parseRemove('<s> 12')).toBeNull();
  });
  it('recognizes <sc>', () => {
    expect(parser.isClear('<sc>')).toBe(true);
    expect(parser.isClear('<s> 1')).toBe(false);
  });
});

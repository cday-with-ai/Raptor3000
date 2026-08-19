import { describe, it, expect } from 'vitest';
import { SEG_IDS, segmentsFor } from '../components/SevenSeg.js';

describe('seven-segment map', () => {
  it('lights a full 8 and a slim 1', () => {
    expect([...segmentsFor('8')].sort()).toEqual([...SEG_IDS].sort());
    expect([...segmentsFor('1')].sort()).toEqual(['b', 'c']);
  });

  it('every decimal digit has at least two bars', () => {
    for (const ch of '0123456789') {
      expect(segmentsFor(ch).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('unknown characters stay dark — the alphabet is 0-9, colon, and a dot', () => {
    expect(segmentsFor('x')).toEqual([]);
    expect(segmentsFor(':')).toEqual([]);
    expect(segmentsFor('.')).toEqual([]);
    expect(segmentsFor('-')).toEqual([]);
  });
});

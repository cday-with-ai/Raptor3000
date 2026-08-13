import { describe, it, expect } from 'vitest';
import {
  X_MIN_ETIME,
  etimeOf,
  ratingOf,
  xFrac,
  yFrac,
} from '../seekGraph.js';

/** Seek-graph projection (2026-08-13): Raptor's etime on a log X. */
describe('seek graph projection', () => {
  it('etime is minutes plus two-thirds increment', () => {
    expect(etimeOf({ minutes: 2, increment: 12 })).toBe(10);
    expect(etimeOf({ minutes: 5, increment: 0 })).toBe(5);
  });

  it('x is log-scaled and clamped into [0,1]', () => {
    expect(xFrac(X_MIN_ETIME)).toBe(0);
    expect(xFrac(180)).toBe(1);
    expect(xFrac(1000)).toBe(1);
    const one = xFrac(1);
    const five = xFrac(5);
    const fifteen = xFrac(15);
    // log spacing: 1→5 and 5→25 would be equal; 5→15 is smaller than 1→5
    expect(five - one).toBeGreaterThan(fifteen - five);
  });

  it('unrated/provisional-zero ratings sit at the floor', () => {
    expect(ratingOf({ rating: '----' })).toBe(ratingOf({ rating: '0' }));
    expect(ratingOf({ rating: '1927' })).toBe(1927);
    expect(yFrac(ratingOf({ rating: '----' }))).toBe(0);
  });
});

import type { Seek } from '@raptor3000/shared';

/**
 * Seek-graph geometry (2026-08-13), split from the component so the
 * projection is testable. Raptor's convention: X is expected game time
 * — minutes + two-thirds of the increment (a 40-move estimate) — on a
 * log scale so 1 0 and 15 0 both get real estate; Y is rating, linear.
 */
export const X_MIN_ETIME = 0.4; // untimed/1+0 park at the left edge
export const X_MAX_ETIME = 180;
export const Y_MIN_RATING = 400;
export const Y_MAX_RATING = 2800;

export function etimeOf(seek: Pick<Seek, 'minutes' | 'increment'>): number {
  return seek.minutes + (2 * seek.increment) / 3;
}

/** 0..1 across the plot, left → right. */
export function xFrac(etime: number): number {
  const clamped = Math.min(X_MAX_ETIME, Math.max(X_MIN_ETIME, etime));
  return (
    Math.log(clamped / X_MIN_ETIME) / Math.log(X_MAX_ETIME / X_MIN_ETIME)
  );
}

/** Numeric rating for plotting; unrated/provisional-0 sits at the floor. */
export function ratingOf(seek: Pick<Seek, 'rating'>): number {
  const n = parseInt(seek.rating, 10);
  return Number.isFinite(n) && n > 0 ? n : Y_MIN_RATING;
}

/** 0..1 up the plot, bottom → top. */
export function yFrac(rating: number): number {
  const clamped = Math.min(Y_MAX_RATING, Math.max(Y_MIN_RATING, rating));
  return (clamped - Y_MIN_RATING) / (Y_MAX_RATING - Y_MIN_RATING);
}

/** The gridline stops both axes draw. */
export const X_TICKS = [1, 3, 5, 15, 45, 120] as const;
export const Y_TICKS = [800, 1200, 1600, 2000, 2400] as const;

export function seekTitle(s: Seek): string {
  const bits = [
    `${s.name} (${s.rating})`,
    `${s.minutes} ${s.increment} ${s.rated ? 'r' : 'u'} ${s.typeDescription}`,
  ];
  if (s.manual) bits.push('manual');
  return bits.join(' · ') + ` — click to play ${s.ad}`;
}

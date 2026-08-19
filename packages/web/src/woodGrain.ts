/**
 * Per-square wood. Seeded from the square name so a1 always looks like
 * a1 — the figure is random across the board, not across frames.
 *
 * This drew 7-12 curved strokes and an occasional hollow ellipse per
 * square until 2026-08-19. Wood is not lines on a surface, it is density
 * varying continuously, so it is now one `feTurbulence` stretched hard
 * along the grain (see `WoodSquare`). Carson asked for "real wood yet
 * subtle enough to play on without drawing your attention away", and the
 * change that bought the most was not the texture — it was dropping the
 * random per-square rotation. Every square used to be turned by ±8°,
 * which at 64px reads as noise. A veneered board is cut from one sheet:
 * the grain runs the same way everywhere and the squares differ in
 * figure, not in direction.
 */

export const WOOD_THEMES = [
  'brown',
  'horsey',
  'walnut',
  'maple',
  'rosewood',
] as const;

export function isWoodTheme(theme: string): boolean {
  return (WOOD_THEMES as readonly string[]).includes(theme);
}

export interface WoodGrain {
  /** feTurbulence seed — this leaf's figure. */
  seed: number;
  /**
   * Lightness drift for this leaf, as a `shiftHex` amount. Small on
   * purpose: two leaves off the same log differ, but a board whose
   * squares differ enough to notice stops reading as one board.
   */
  drift: number;
}

function hashSq(sq: string): number {
  let h = 2166136261;
  for (let i = 0; i < sq.length; i++) h = Math.imul(h ^ sq.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function woodGrainFor(sq: string): WoodGrain {
  const h = hashSq(sq);
  return {
    seed: h % 9973,
    // ±1.8%, derived from a different slice of the hash than the seed so
    // figure and shade are not correlated.
    drift: (((h >>> 16) % 1000) / 1000 - 0.5) * 0.036,
  };
}

/** Mix a hex toward black (t>0) or white (t<0). */
export function shiftHex(hex: string, t: number): string {
  const n = hex.replace('#', '');
  if (n.length !== 6) return hex;
  const ch = (i: number) => parseInt(n.slice(i, i + 2), 16);
  const mix = (c: number) => {
    const x = t >= 0 ? c * (1 - t) : c + (255 - c) * -t;
    return Math.max(0, Math.min(255, Math.round(x)));
  };
  const h = (c: number) => mix(c).toString(16).padStart(2, '0');
  return `#${h(ch(0))}${h(ch(2))}${h(ch(4))}`;
}

/**
 * The frame rail, in the same wood as the squares, as a CSS
 * `background-image` value.
 *
 * The wood rails shipped as `repeating-linear-gradient(90deg, …)` on an
 * 18-pixel period, which is a barcode: at any board size you can count
 * the stripes and they never line up with the board. Same turbulence
 * source as the squares, so rail and board look cut from one tree.
 *
 * Single quotes inside `url()` on purpose — this string also reaches
 * plain HTML style attributes in the demo pages, where a double quote
 * silently terminates the attribute and the whole declaration is
 * dropped.
 */
export function woodRail(base: string, seed = 11): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="560" viewBox="0 0 560 560">` +
    `<defs><filter id="r" x="-10%" y="-10%" width="120%" height="120%">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.004 0.09" numOctaves="5" ` +
    `seed="${seed}" result="n"/>` +
    `<feColorMatrix in="n" type="matrix" ` +
    `values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" result="a"/>` +
    `<feComponentTransfer in="a"><feFuncA type="table" tableValues="0 0.16"/>` +
    `</feComponentTransfer></filter>` +
    // A whisper of top-down light only. The bevel belongs in the frame's
    // box-shadow, where it can follow all four sides — this image covers
    // the whole frame element, so a real gradient here would run a
    // top-to-bottom fade down the left and right rails, which nothing does.
    `<linearGradient id="s" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#fff" stop-opacity="0.035"/>` +
    `<stop offset="1" stop-color="#000" stop-opacity="0.045"/></linearGradient></defs>` +
    `<rect width="560" height="560" fill="${base}"/>` +
    `<rect width="560" height="560" fill="${shiftHex(base, 0.3)}" filter="url(#r)"/>` +
    `<rect width="560" height="560" fill="url(#s)"/></svg>`;
  return `url('data:image/svg+xml,${encodeURIComponent(svg)}')`;
}

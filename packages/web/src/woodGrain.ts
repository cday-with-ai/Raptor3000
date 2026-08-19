/**
 * Per-square wood. Seeded from the square name so a1 always looks like
 * a1 — the grain is random across the board, not across frames.
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

export interface WoodStreak {
  y: number;
  amp: number;
  thick: number;
  op: number;
  dark: boolean;
}

export interface WoodKnot {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

export interface WoodGrain {
  rot: number;
  shift: number;
  streaks: WoodStreak[];
  knot: WoodKnot | null;
}

function hashSq(sq: string): number {
  let h = 2166136261;
  for (let i = 0; i < sq.length; i++) h = Math.imul(h ^ sq.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rng(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 16807) >>> 0;
    return (s & 0xfffffff) / 0xfffffff;
  };
}

export function woodGrainFor(sq: string): WoodGrain {
  const r = rng(hashSq(sq));
  const n = 7 + Math.floor(r() * 6);
  const streaks: WoodStreak[] = [];
  for (let i = 0; i < n; i++) {
    streaks.push({
      y: 4 + r() * 92,
      amp: (r() - 0.5) * 14,
      thick: 0.5 + r() * 2.4,
      op: 0.07 + r() * 0.16,
      dark: r() > 0.35,
    });
  }
  const knot = r() > 0.72
    ? { x: 18 + r() * 64, y: 18 + r() * 64, rx: 2.2 + r() * 3.4, ry: 1.4 + r() * 2.2 }
    : null;
  return {
    rot: (r() - 0.5) * 16,
    shift: (r() - 0.5) * 0.1,
    streaks,
    knot,
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

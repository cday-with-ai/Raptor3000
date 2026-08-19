import { useId } from 'react';
import { type WoodGrain, shiftHex } from '../woodGrain.js';

/**
 * One leaf of veneer.
 *
 * Three decisions, in order of how much each bought:
 *
 * 1. **One grain direction.** No rotation at all. See `woodGrain.ts`.
 * 2. **Fibre, not strokes.** `feTurbulence` stretched twenty times finer
 *    across the grain than along it, which is what makes it read as
 *    density rather than as scratches.
 * 3. **The leaf edge.** 5% light along the top-left, 5% dark along the
 *    bottom-right. Not a border anyone notices — it is the reason the
 *    board stops looking printed and starts looking laid. Remove it and
 *    the squares fuse into one sheet with a checker pattern on it.
 *
 * Strength is Carson's pick of three (2026-08-19): the alpha ceiling and
 * the tint are the only knobs, and this is the middle setting — grain
 * visible, figure varying square to square, silent under a piece.
 *
 * The filter id comes from `useId` rather than from the seed: the options
 * page renders the same four square names many times over for the theme
 * and frame previews, and ids are per-document.
 */
export function WoodSquare({ grain, base }: { grain: WoodGrain; base: string }) {
  const id = useId();
  const fid = `w${id.replace(/:/g, '')}`;
  const plate = shiftHex(base, grain.drift);
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        display: 'block',
      }}
    >
      <defs>
        <filter id={fid} x="-25%" y="-25%" width="150%" height="150%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.005 0.105"
            numOctaves={5}
            seed={grain.seed}
            result="n"
          />
          <feColorMatrix
            in="n"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0"
            result="a"
          />
          <feComponentTransfer in="a">
            <feFuncA type="table" tableValues="0 0.13" />
          </feComponentTransfer>
        </filter>
      </defs>
      <rect width="100" height="100" fill={plate} />
      <rect
        x="-30"
        y="-30"
        width="160"
        height="160"
        fill={shiftHex(base, 0.24)}
        filter={`url(#${fid})`}
      />
      <path d="M 0 100 V 0 H 100 L 96 4 H 4 V 96 Z" fill="#ffffff" fillOpacity="0.05" />
      <path d="M 100 0 V 100 H 0 L 4 96 H 96 V 4 Z" fill="#000000" fillOpacity="0.05" />
    </svg>
  );
}

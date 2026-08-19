/**
 * The clock alphabet: 0–9, a colon, and a decimal. Nothing else.
 * Thickness and gaps are ours so Chronos / LCD don't inherit a font's
 * colon width. View-box is 12×20 per digit; bars are chamfered with
 * a small air gap so 8 stays an 8.
 */

export const SEG_IDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'] as const;
export type SegId = (typeof SEG_IDS)[number];

const ON: Record<string, readonly SegId[]> = {
  '0': ['a', 'b', 'c', 'd', 'e', 'f'],
  '1': ['b', 'c'],
  '2': ['a', 'b', 'd', 'e', 'g'],
  '3': ['a', 'b', 'c', 'd', 'g'],
  '4': ['b', 'c', 'f', 'g'],
  '5': ['a', 'c', 'd', 'f', 'g'],
  '6': ['a', 'c', 'd', 'e', 'f', 'g'],
  '7': ['a', 'b', 'c'],
  '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  '9': ['a', 'b', 'c', 'd', 'f', 'g'],
};

export function segmentsFor(ch: string): readonly SegId[] {
  return ON[ch] ?? [];
}

/** Chamfered bars in a 12×20 box. */
const PATH: Record<SegId, string> = {
  a: 'M 2.4 1.2 L 9.6 1.2 L 8.5 2.5 L 3.5 2.5 Z',
  g: 'M 3.4 9.3 L 8.6 9.3 L 9.5 10 L 8.6 10.7 L 3.4 10.7 L 2.5 10 Z',
  d: 'M 3.5 17.5 L 8.5 17.5 L 9.6 18.8 L 2.4 18.8 Z',
  f: 'M 1.2 2.4 L 2.5 3.5 L 2.5 8.4 L 1.2 9.2 L 1.2 2.4 Z',
  b: 'M 10.8 2.4 L 10.8 9.2 L 9.5 8.4 L 9.5 3.5 Z',
  e: 'M 1.2 10.8 L 2.5 11.6 L 2.5 16.5 L 1.2 17.6 L 1.2 10.8 Z',
  c: 'M 10.8 10.8 L 10.8 17.6 L 9.5 16.5 L 9.5 11.6 Z',
};

const DIGIT_W = 12;
const DIGIT_H = 20;
const COLON_W = 5;
const DOT_W = 4;

export function SevenSegTime({
  text,
  color,
  height,
  ghost = false,
  blinkColon = false,
}: {
  text: string;
  color: string;
  height: number;
  ghost?: boolean;
  blinkColon?: boolean;
}) {
  const scale = height / DIGIT_H;
  const chars = [...text];
  let x = 0;
  const nodes: { key: string; x: number; w: number; el: 'digit' | 'colon' | 'dot'; ch?: string }[] = [];
  chars.forEach((ch, i) => {
    if (ch === ':') {
      nodes.push({ key: `c${i}`, x, w: COLON_W, el: 'colon' });
      x += COLON_W;
    } else if (ch === '.') {
      nodes.push({ key: `p${i}`, x, w: DOT_W, el: 'dot' });
      x += DOT_W;
    } else {
      nodes.push({ key: `d${i}`, x, w: DIGIT_W, el: 'digit', ch });
      x += DIGIT_W + 1;
    }
  });
  const width = x;

  return (
    <svg
      width={width * scale}
      height={height}
      viewBox={`0 0 ${width} ${DIGIT_H}`}
      aria-hidden
      style={{ display: 'block' }}
    >
      {nodes.map(n => {
        if (n.el === 'colon') {
          return (
            <g
              key={n.key}
              transform={`translate(${n.x} 0)`}
              className={blinkColon ? 'raptor-clock-colon' : undefined}
              fill={color}
            >
              <rect x="1.6" y="5.2" width="1.8" height="1.8" rx="0.2" />
              <rect x="1.6" y="13" width="1.8" height="1.8" rx="0.2" />
            </g>
          );
        }
        if (n.el === 'dot') {
          return (
            <rect
              key={n.key}
              x={n.x + 1}
              y="16.6"
              width="1.8"
              height="1.8"
              rx="0.2"
              fill={color}
            />
          );
        }
        const on = new Set(segmentsFor(n.ch ?? ''));
        return (
          <g key={n.key} transform={`translate(${n.x} 0)`}>
            {SEG_IDS.map(id => (
              <path
                key={id}
                d={PATH[id]}
                fill={color}
                opacity={on.has(id) ? 1 : ghost ? 0.14 : 0}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

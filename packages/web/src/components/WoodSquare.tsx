import { type WoodGrain, shiftHex } from '../woodGrain.js';

/** One veneer square. Grain is passed in so the square name is hashed once. */
export function WoodSquare({
  grain,
  base,
}: {
  grain: WoodGrain;
  base: string;
}) {
  const fill = shiftHex(base, grain.shift);
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
      <rect width="100" height="100" fill={fill} />
      <g transform={`rotate(${grain.rot} 50 50)`}>
        {grain.streaks.map((s, i) => (
          <path
            key={i}
            d={`M -8 ${s.y.toFixed(1)} Q 50 ${(s.y + s.amp).toFixed(1)} 108 ${s.y.toFixed(1)}`}
            fill="none"
            stroke={shiftHex(base, s.dark ? 0.22 : -0.14)}
            strokeWidth={s.thick}
            strokeOpacity={s.op}
            strokeLinecap="butt"
          />
        ))}
        {grain.knot && (
          <ellipse
            cx={grain.knot.x}
            cy={grain.knot.y}
            rx={grain.knot.rx}
            ry={grain.knot.ry}
            fill="none"
            stroke={shiftHex(base, 0.28)}
            strokeWidth="0.7"
            strokeOpacity="0.35"
          />
        )}
      </g>
    </svg>
  );
}

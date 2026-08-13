import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import type { Seek } from '@raptor3000/shared';
import type { RaptorContext } from './appContext.js';
import { seekPane } from './shellStyles.js';
import {
  X_TICKS,
  Y_TICKS,
  etimeOf,
  ratingOf,
  seekTitle,
  xFrac,
  yFrac,
} from '../seekGraph.js';

/**
 * The seek graph (finished 2026-08-13, Carson: "finish up the seek
 * graph"). A live scatter of every outstanding ad — X is expected game
 * time (log), Y is rating — fed by the seekinfo stream GameService now
 * keeps. Click a dot, play the seek. Rated seeks are filled, unrated
 * hollow; manual seeks get a ring (the seeker must confirm you).
 */
export const SeekGraphTab = observer(function SeekGraphTab({
  context,
}: {
  context: RaptorContext;
}) {
  const [seeks, setSeeks] = useState<readonly Seek[]>(() =>
    context.gameService.getSeeks(),
  );
  useEffect(() => {
    const listener = { seeksChanged: (s: readonly Seek[]) => setSeeks(s) };
    context.gameService.addListener(listener);
    setSeeks(context.gameService.getSeeks());
    return () => context.gameService.removeListener(listener);
  }, [context]);

  const W = 900;
  const H = 480;
  const PAD = { left: 44, right: 14, top: 10, bottom: 26 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const px = (f: number) => PAD.left + f * plotW;
  const py = (f: number) => PAD.top + (1 - f) * plotH;

  return (
    <main style={seekPane}>
      <h2 style={{ margin: 0, fontSize: 16 }}>
        Seek Graph{' '}
        <span style={{ fontWeight: 400, fontSize: 12, opacity: 0.6 }}>
          {seeks.length} {seeks.length === 1 ? 'ad' : 'ads'} · click to play ·
          filled = rated, hollow = unrated, ringed = manual
        </span>
      </h2>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{
          width: '100%',
          flex: 1,
          marginTop: 12,
          minHeight: 360,
          background: 'var(--bg-raised)',
          border: '1px solid var(--border)',
          borderRadius: 6,
        }}
      >
        {/* gridlines + axis labels */}
        {X_TICKS.map(t => (
          <g key={`x${t}`}>
            <line
              x1={px(xFrac(t))}
              x2={px(xFrac(t))}
              y1={py(0)}
              y2={py(1)}
              stroke="var(--border-soft)"
              strokeWidth={1}
            />
            <text
              x={px(xFrac(t))}
              y={H - 8}
              textAnchor="middle"
              fontSize={11}
              fill="var(--fg-dim)"
            >
              {t}m
            </text>
          </g>
        ))}
        {Y_TICKS.map(t => (
          <g key={`y${t}`}>
            <line
              x1={px(0)}
              x2={px(1)}
              y1={py(yFrac(t))}
              y2={py(yFrac(t))}
              stroke="var(--border-soft)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={py(yFrac(t)) + 4}
              textAnchor="end"
              fontSize={11}
              fill="var(--fg-dim)"
            >
              {t}
            </text>
          </g>
        ))}

        {/* the ads */}
        {seeks.map(s => {
          const cx = px(xFrac(etimeOf(s)));
          const cy = py(yFrac(ratingOf(s)));
          return (
            <g
              key={s.ad}
              style={{ cursor: 'pointer' }}
              onClick={() => context.connector.sendMessage(`play ${s.ad}`)}
            >
              <title>{seekTitle(s)}</title>
              {/* generous invisible hit area */}
              <circle cx={cx} cy={cy} r={12} fill="transparent" />
              {s.manual && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={9}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={1}
                  opacity={0.7}
                />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={5}
                fill={s.rated ? 'var(--accent)' : 'transparent'}
                stroke="var(--accent)"
                strokeWidth={1.6}
              />
              <text
                x={cx + 9}
                y={cy + 4}
                fontSize={10}
                fill="var(--fg-dim)"
                pointerEvents="none"
              >
                {s.rating}
              </text>
            </g>
          );
        })}

        {seeks.length === 0 && (
          <text
            x={W / 2}
            y={H / 2}
            textAnchor="middle"
            fontSize={13}
            fill="var(--fg-dim)"
          >
            no outstanding seeks — they appear here live
          </text>
        )}
      </svg>
    </main>
  );
});

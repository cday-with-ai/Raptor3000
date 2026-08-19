import { boardColors, type AppPreferences, type BoardTheme } from '../preferences.js';
import { isWoodTheme, woodGrainFor } from '../woodGrain.js';
import { WoodSquare } from './WoodSquare.js';
import {
  BOARD_FRAMES,
  BOARD_FRAME_DESIGNS,
  BOARD_FRAME_LABELS,
  type BoardFrame,
} from '../boardFrames.js';
import { PreviewSelect } from './PreviewSelect.js';
import { inSquareInk } from '../boardLabels.js';

/** Mini framed board so a frame can be picked by eye, not by name. */
export function BoardFramePicker({
  prefs,
  onChange,
}: {
  prefs: AppPreferences;
  onChange: (id: BoardFrame) => void;
}) {
  const { light, dark } = boardColors(prefs);
  return (
    <PreviewSelect<BoardFrame>
      value={prefs.boardFrame}
      options={BOARD_FRAMES}
      label={id => BOARD_FRAME_LABELS[id]}
      blurb={id => BOARD_FRAME_DESIGNS[id].blurb}
      groupLabel={BOARD_FRAME_LABELS[prefs.boardFrame]}
      columnWidth={148}
      onChange={onChange}
      preview={(id, compact) => (
        <MiniBoard
          frame={id}
          light={light}
          dark={dark}
          wood={isWoodTheme(prefs.boardTheme)}
          theme={prefs.boardTheme}
          size={compact ? 34 : undefined}
          labels={!compact}
        />
      )}
    />
  );
}

function MiniBoard({
  frame,
  light,
  dark,
  wood,
  theme,
  size,
  labels,
}: {
  frame: BoardFrame;
  light: string;
  dark: string;
  /** Needed for the label ink, which a theme may override. */
  theme: BoardTheme;
  /** Fixed px for the collapsed trigger; fills its card when undefined. */
  size?: number;
  wood: boolean;
  /** Draw the file/rank labels. Off in the collapsed trigger, where the
   *  board is 34px and the type would be a smudge. */
  labels?: boolean;
}) {
  const d = BOARD_FRAME_DESIGNS[frame];
  const pad = d.gutter ? `${d.gutter * 100}%` : 0;
  // Card columns are 148px wide with 10px of padding either side, so an
  // unsized board lands near 128. The labels need a px size and there is
  // no element to measure yet, so derive it.
  const px = size ?? 128;
  const type = Math.max(5, Math.round(px * 0.055));
  const rim = d.coords === 'rim' && d.gutter > 0;
  const inSquare = d.coords === 'in-square';
  const FILES = ['a', 'b', 'c', 'd'];
  // Rank 1 at the bottom, the way a board is drawn — independent of the
  // top-down index the grain uses.
  const RANKS = ['4', '3', '2', '1'];
  const cells = [];
  for (let i = 0; i < 16; i++) {
    const r = Math.floor(i / 4);
    const c = i % 4;
    const base = (r + c) % 2 === 0 ? light : dark;
    // An in-square coordinate is drawn in the OTHER square's colour — the
    // rule every real board uses, and the only one that survives an
    // arbitrary palette. Shadow and Flush declare `labelColor: 'inherit'`,
    // which used to resolve to a theme grey that knew nothing about the
    // square under it: legible on the default brown, mud on green, gone on
    // ebony. A frame that names its own label colour still wins, because
    // that colour was chosen against its rail, not against a square.
    const ink =
      d.labelColor === 'inherit'
        ? inSquareInk(theme, (r + c) % 2 !== 0, light, dark)
        : d.labelColor;
    const sq = 'abcdefgh'[c] + String(r + 1);
    cells.push(
      <div
        key={i}
        style={{
          background: base,
          aspectRatio: '1',
          position: 'relative',
        }}
      >
        {wood && <WoodSquare grain={woodGrainFor(sq)} base={base} />}
        {labels && inSquare && r === 3 && (
          <span style={{ ...cornerLabel(ink, type), insetInlineEnd: 1, bottom: 0 }}>
            {FILES[c]}
          </span>
        )}
        {labels && inSquare && c === 0 && (
          <span style={{ ...cornerLabel(ink, type), insetInlineStart: 1, top: 0 }}>
            {RANKS[r]}
          </span>
        )}
      </div>,
    );
  }
  return (
    <div
      style={{
        width: size ?? '100%',
        aspectRatio: '1',
        boxSizing: 'border-box',
        position: 'relative',
        padding: pad,
        background: d.rail,
        borderRadius: d.radius,
        boxShadow: d.shadow,
      }}
    >
      {labels && rim && (
        <>
          {/* Along the bottom rail, and up the left one. Mat puts them on
              all four sides, which is the whole difference between it and
              the wood frames — worth being able to see before picking. */}
          <span style={rimStrip(pad, type, d.labelColor, 'bottom')}>
            {FILES.map(f => (
              <span key={f}>{f}</span>
            ))}
          </span>
          <span style={rimStrip(pad, type, d.labelColor, 'left')}>
            {RANKS.map(r => (
              <span key={r}>{r}</span>
            ))}
          </span>
          {d.coordsAllSides && (
            <>
              <span style={rimStrip(pad, type, d.labelColor, 'top')}>
                {FILES.map(f => (
                  <span key={f}>{f}</span>
                ))}
              </span>
              <span style={rimStrip(pad, type, d.labelColor, 'right')}>
                {RANKS.map(r => (
                  <span key={r}>{r}</span>
                ))}
              </span>
            </>
          )}
        </>
      )}
      {/* The inlay is what the eye picks a frame by, so the picker has to
          show it. Scaled down with the chip — a fixed 3px ring on a 34px
          preview is a third of the board. */}
      <div
        style={
          d.inlay
            ? {
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                padding: Math.max(1, Math.round((d.inlayWidth ?? 3) * (px / 150))),
                background: d.inlay,
                // see BoardWindow — sized to the ring, not the board
                backgroundSize: `${Math.max(8, Math.round(26 * (px / 150)))}px ${Math.max(8, Math.round(26 * (px / 150)))}px`,
                borderRadius: d.gutter ? 2 : d.radius,
                boxShadow: '0 0 0 1px rgba(0,0,0,0.45)',
              }
            : { width: '100%', height: '100%' }
        }
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            overflow: 'hidden',
            borderRadius: d.gutter ? 1 : d.radius,
            outline: d.piping === 'none' ? undefined : d.piping,
            outlineOffset: d.piping === 'none' ? undefined : -1,
          }}
        >
          {cells}
        </div>
      </div>
    </div>
  );
}

/** A coordinate printed inside an edge square, lichess-style. */
function cornerLabel(color: string, size: number): React.CSSProperties {
  return {
    position: 'absolute',
    fontSize: size,
    lineHeight: 1,
    fontWeight: 700,
    color,
    pointerEvents: 'none',
  };
}

/** Rough luminance test, enough to choose which way a halo should go.
 *  Same rule the real board uses in BoardWindow's RimCoords. */
function isLightColor(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return true;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55;
}

/** One run of coordinates lying in the rail on the given side. `pad` is the
 *  rail width as a CSS percentage, so the strip is placed and sized in the
 *  same units the padding already uses. */
function rimStrip(
  pad: string | 0,
  size: number,
  color: string,
  side: 'top' | 'bottom' | 'left' | 'right',
): React.CSSProperties {
  const width = pad === 0 ? '0' : pad;
  const base: React.CSSProperties = {
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    fontSize: size,
    lineHeight: 1,
    fontWeight: 700,
    color: color === 'inherit' ? 'var(--fg-muted)' : color,
    // Same halo the real board draws, for the same reason: a label on wood
    // grain needs separation the flat rail colour cannot give it.
    textShadow: isLightColor(color)
      ? '0 1px 1px rgba(0,0,0,0.6)'
      : '0 1px 1px rgba(255,255,255,0.55)',
    pointerEvents: 'none',
  };
  const horizontal = side === 'top' || side === 'bottom';
  return {
    ...base,
    flexDirection: horizontal ? 'row' : 'column',
    insetInlineStart: horizontal ? width : side === 'left' ? 0 : undefined,
    insetInlineEnd: horizontal ? width : side === 'right' ? 0 : undefined,
    top: horizontal ? (side === 'top' ? 0 : undefined) : width,
    bottom: horizontal ? (side === 'bottom' ? 0 : undefined) : width,
    height: horizontal ? width : undefined,
    width: horizontal ? undefined : width,
  };
}

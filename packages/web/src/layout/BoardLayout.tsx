import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { saveLivePreference, useLivePreferences } from '../useLivePreferences.js';

/**
 * Single default board-window layout. Ported from Raptor's ChessArea /
 * Decaf's ChessAreaLayout — the "opponent on top, you on bottom, move
 * list right" style that both apps used as the default. The board column
 * geometry is ported from Chess Ascent's session screens: the info bands
 * are exactly as wide as the board, 4px above it and 12px below it, and
 * the board itself is a measured perfect square.
 *
 *   ┌──────────────────────────────────────────┐
 *   │      Opponent name · rating · clock      │  (band, board-width)
 *   │      ┌─────────────────┐ ┬───────────────┤
 *   │      │                 │ │  Move list    │
 *   │      │      BOARD      │ │               │
 *   │      │ (measured px    │ │  Captured     │
 *   │      │  perfect square)│ │               │
 *   │      └─────────────────┘ │  Status       │
 *   │      You · rating· clock ┴───────────────┤  (band, board-width)
 *   ├──────────────────────────────────────────┤
 *   │ Toolbar: flip, nav arrows, chat mini     │  (tools)
 *   └──────────────────────────────────────────┘
 *
 * Sizing mirrors Chess Ascent's classic-play computation
 * (`min(availWidth - margin, availHeight - bands)`) but measured with a
 * ResizeObserver instead of useWindowDimensions, because this is a popup
 * window the user resizes freely. The measured size is what makes the
 * in-square coordinate labels' font scaling possible downstream.
 */
export interface BoardLayoutProps {
  topBar: ReactNode;      // opponent info band
  bottomBar: ReactNode;   // your info band
  board: ReactNode;       // the board component (fills a size×size box)
  side: ReactNode;        // move list / captures / status column
  toolbar?: ReactNode;    // optional tool row at the very bottom
}

const BAND_GAP_ABOVE = 4;   // Chess Ascent boardHeaderRow marginBottom
const BAND_GAP_BELOW = 12;  // Chess Ascent boardFooterRow marginTop
const CELL_PADDING = 8;

export function BoardLayout(props: BoardLayoutProps) {
  const { topBar, bottomBar, board, side, toolbar } = props;
  const cellRef = useRef<HTMLDivElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState(0);

  // The board/panel divider drags (Carson, 2026-08-12): the side
  // panel's share of the width is a preference, live during the drag,
  // saved on release. The board cell's ResizeObserver re-squares the
  // board as the column moves.
  const prefs = useLivePreferences();
  const [liveRatio, setLiveRatio] = useState<number | null>(null);
  const panelRatio = liveRatio ?? prefs.boardPanelRatio;
  const clampRatio = (v: number) => Math.min(0.5, Math.max(0.1, v));

  useLayoutEffect(() => {
    const cell = cellRef.current;
    if (!cell) return undefined;
    const recompute = () => {
      const rect = cell.getBoundingClientRect();
      const topH = topRef.current?.offsetHeight ?? 0;
      const bottomH = bottomRef.current?.offsetHeight ?? 0;
      const availW = rect.width - CELL_PADDING * 2;
      const availH =
        rect.height -
        CELL_PADDING * 2 -
        topH -
        bottomH -
        BAND_GAP_ABOVE -
        BAND_GAP_BELOW;
      setSize(Math.max(0, Math.floor(Math.min(availW, availH))));
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(cell);
    if (topRef.current) ro.observe(topRef.current);
    if (bottomRef.current) ro.observe(bottomRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      style={{
        display: 'grid',
        gridTemplateRows: 'minmax(0, 1fr) auto',
        gridTemplateColumns: `minmax(0, 1fr) 6px ${(panelRatio * 100).toFixed(2)}%`,
        height: '100vh',
        width: '100vw',
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
      }}
    >
      <div ref={cellRef} style={boardCellStyle}>
        <div ref={topRef} style={{ width: size || undefined, marginBottom: BAND_GAP_ABOVE }}>
          {topBar}
        </div>
        <div style={{ width: size, height: size }}>{board}</div>
        <div ref={bottomRef} style={{ width: size || undefined, marginTop: BAND_GAP_BELOW }}>
          {bottomBar}
        </div>
      </div>

      <div
        style={dividerStyle}
        onPointerDown={e => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setLiveRatio(panelRatio);
        }}
        onPointerMove={e => {
          if (liveRatio === null) return;
          const rect = rootRef.current?.getBoundingClientRect();
          if (!rect || rect.width === 0) return;
          setLiveRatio(clampRatio((rect.right - e.clientX) / rect.width));
        }}
        onPointerUp={() => {
          if (liveRatio !== null) saveLivePreference('boardPanelRatio', clampRatio(liveRatio));
          setLiveRatio(null);
        }}
        onPointerCancel={() => setLiveRatio(null)}
      />

      <div style={sidePanelStyle}>{side}</div>

      {toolbar && (
        <div style={{ gridRow: '2', gridColumn: '1 / span 3' }}>{toolbar}</div>
      )}
    </div>
  );
}

const dividerStyle = {
  gridRow: '1',
  gridColumn: '2',
  cursor: 'col-resize',
  background: 'var(--border-soft)',
  touchAction: 'none',
} as const;

const boardCellStyle = {
  gridRow: '1',
  gridColumn: '1',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: CELL_PADDING,
  minWidth: 0,
  minHeight: 0,
} as const;

const sidePanelStyle = {
  gridRow: '1',
  gridColumn: '3',
  padding: 8,
  overflow: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  // Status rides the top, Moves the bottom, Engine floats between
  // (Carson, 2026-08-12).
  justifyContent: 'space-between',
} as const;

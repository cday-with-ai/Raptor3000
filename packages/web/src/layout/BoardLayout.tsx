import type { ReactNode } from 'react';

/**
 * Single default board-window layout. Ported from Raptor's ChessArea /
 * Decaf's ChessAreaLayout — the "opponent on top, you on bottom, move
 * list right" style that both apps used as the default.
 *
 *   ┌──────────────────────────────────────────┐
 *   │ Opponent name · rating · clock           │  (top bar)
 *   ├─────────────────┬────────────────────────┤
 *   │                 │  Move list             │
 *   │      BOARD      │                        │
 *   │  (always square,│  Captured / holdings   │
 *   │   fills height) │                        │
 *   │                 │  Status / info         │
 *   ├─────────────────┴────────────────────────┤
 *   │ You · rating · clock                     │  (bottom bar)
 *   ├──────────────────────────────────────────┤
 *   │ Toolbar: flip, nav arrows, chat mini     │  (tools)
 *   └──────────────────────────────────────────┘
 *
 * The board cell is kept square via `aspect-ratio: 1` on an inner wrapper;
 * the side panel stretches to match the board's height. This mimics
 * Decaf's SquareSandwichLayout LayoutManager without needing custom layout
 * code — CSS Grid handles it.
 */
export interface BoardLayoutProps {
  topBar: ReactNode;      // opponent info row
  bottomBar: ReactNode;   // your info row
  board: ReactNode;       // the board component
  side: ReactNode;        // move list / captures / status column
  toolbar?: ReactNode;    // optional tool row at the very bottom
}

export function BoardLayout(props: BoardLayoutProps) {
  const { topBar, bottomBar, board, side, toolbar } = props;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto auto',
        gridTemplateColumns: 'minmax(0, 1fr) 220px',
        height: '100vh',
        width: '100vw',
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
      }}
    >
      <div style={gridArea(1, 1, 2)}>{topBar}</div>

      <div style={{ ...gridArea(2, 1, 1), ...boardCellStyle }}>
        <div style={boardSquareStyle}>{board}</div>
      </div>

      <div style={{ ...gridArea(2, 2, 1), ...sidePanelStyle }}>{side}</div>

      <div style={gridArea(3, 1, 2)}>{bottomBar}</div>

      {toolbar && <div style={gridArea(4, 1, 2)}>{toolbar}</div>}
    </div>
  );
}

function gridArea(row: number, col: number, colSpan: number) {
  return {
    gridRow: String(row),
    gridColumn: `${col} / span ${colSpan}`,
  } as const;
}

const boardCellStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 8,
  minWidth: 0,
  minHeight: 0,
} as const;

/** Inner wrapper that enforces a perfect square whatever the parent allots. */
const boardSquareStyle = {
  aspectRatio: '1',
  width: 'min(100%, 100%)',
  maxHeight: '100%',
  // Stay square even if height is the binding constraint.
  height: 'auto',
  display: 'flex',
  alignItems: 'stretch',
  justifyContent: 'stretch',
} as const;

const sidePanelStyle = {
  padding: 8,
  borderLeft: '1px solid var(--border-soft)',
  overflow: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
} as const;

import { observer } from 'mobx-react-lite';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  BoardMode,
  engineAnalysisAllowed,
  modeFromRelation,
  lastMoveSquares,
  parseSquare,
  squareName,
  isWhitePiece,
  isBlackPiece,
  isPawn,
  isKing,
  type BoardModeCode,
  type Style12Message,
} from '@raptor3000/shared';
import type { RaptorContext } from './appContext.js';
import { BoardLayout } from '../layout/BoardLayout.js';
import {
  toolbarButtonProps,
  toolbarLayoutFor,
  type ToolbarItem,
} from './boardToolbar.js';
import { installPositionTracker, windowStorageKey } from './windowPosition.js';
import type { EngineAnalysis } from '../engine/EngineService.js';
import {
  boardColors,
  loadPreferences,
  type AppPreferences,
} from '../preferences.js';

/**
 * Board window — per-game popup. Subscribes to GameService for its
 * gameId: each Style12 update re-renders the position, clocks, names,
 * and move info.
 *
 * Features live in this file:
 *   - Clock tick: between Style12 updates we locally decrement the
 *     side-to-move's clock every 100ms for a smoother display.
 *   - Move input: click-to-move (and click-again-to-cancel). In PLAYING
 *     mode moves go straight to FICS via `sendMessageHidden`. In
 *     EXAMINING mode, same (FICS examine accepts moves just like play).
 *   - Last-move highlight: squares from the previous move are tinted.
 *   - Selection highlight: the clicked source square is outlined.
 *   - Premove: clicking during opponent's move stores a pending move
 *     and highlights it; fired automatically on the next `gameStateChanged`
 *     that makes it our turn.
 *
 * Mode is derived from the Style12 relation on each update.
 */
export const BoardWindow = observer(function BoardWindow({
  context,
  gameId,
}: {
  context: RaptorContext;
  gameId: string | null;
}) {
  useEffect(
    () => installPositionTracker(windowStorageKey('board', gameId)),
    [gameId],
  );

  const [s12, setS12] = useState<Style12Message | undefined>(() =>
    gameId ? context.gameService.getLatestStyle12(gameId) : undefined,
  );

  // Subscribe to GameService for THIS game's updates.
  useEffect(() => {
    if (!gameId) return undefined;
    const listener = {
      gameStateChanged: (id: string) => {
        if (id !== gameId) return;
        const latest = context.gameService.getLatestStyle12(gameId);
        if (latest) setS12(latest);
      },
      gameInactive: (id: string) => {
        if (id !== gameId) return;
        // keep final position visible
      },
    };
    context.gameService.addListener(listener);
    const initial = context.gameService.getLatestStyle12(gameId);
    if (initial) setS12(initial);
    return () => context.gameService.removeListener(listener);
  }, [context, gameId]);

  const fallbackMode: BoardModeCode = useMemo(() => {
    const p = new URLSearchParams(window.location.search).get('mode');
    return isBoardMode(p) ? p : BoardMode.OBSERVING;
  }, []);

  const mode: BoardModeCode = s12
    ? modeFromRelation(s12.relation)
    : fallbackMode;

  // Locally-ticked clock offsets, applied to the server clocks between
  // Style12 updates. Reset on every new Style12.
  const tick = useClockTick(s12);

  const whiteName = s12?.whiteName ?? 'white';
  const blackName = s12?.blackName ?? 'black';
  const baseWhiteMs = s12?.whiteRemainingTimeMillis ?? 5 * 60 * 1000;
  const baseBlackMs = s12?.blackRemainingTimeMillis ?? 5 * 60 * 1000;
  const whiteTicking = !!(s12?.isClockTicking && s12.isWhitesMoveAfterMoveIsMade);
  const blackTicking = !!(s12?.isClockTicking && !s12?.isWhitesMoveAfterMoveIsMade);
  const whiteClock = Math.max(0, baseWhiteMs - (whiteTicking ? tick : 0));
  const blackClock = Math.max(0, baseBlackMs - (blackTicking ? tick : 0));

  const flipped = !!s12?.isWhiteOnTop;
  const topName = flipped ? whiteName : blackName;
  const bottomName = flipped ? blackName : whiteName;
  const topClock = flipped ? whiteClock : blackClock;
  const bottomClock = flipped ? blackClock : whiteClock;
  const topTicking = flipped ? whiteTicking : blackTicking;
  const bottomTicking = flipped ? blackTicking : whiteTicking;

  const topBar = (
    <InfoBar side="opponent" name={topName} rating="" clockMs={topClock} ticking={topTicking} />
  );
  const bottomBar = (
    <InfoBar side="me" name={bottomName} rating="" clockMs={bottomClock} ticking={bottomTicking} />
  );

  return (
    <BoardLayout
      topBar={topBar}
      bottomBar={bottomBar}
      board={<Board context={context} s12={s12} gameId={gameId} mode={mode} />}
      side={<SidePanel context={context} s12={s12} gameId={gameId} mode={mode} />}
      toolbar={<Toolbar mode={mode} />}
    />
  );
});

function isBoardMode(v: string | null): v is BoardModeCode {
  return (
    v === BoardMode.PLAYING ||
    v === BoardMode.OBSERVING ||
    v === BoardMode.EXAMINING ||
    v === BoardMode.SETUP ||
    v === BoardMode.INACTIVE ||
    v === BoardMode.BUGHOUSE_SUGGEST
  );
}

/**
 * Returns milliseconds elapsed since the last Style12 update, for local
 * clock animation. Snaps back to 0 on every new message so the server is
 * always authoritative when it speaks.
 */
function useClockTick(s12: Style12Message | undefined): number {
  const [tick, setTick] = useState(0);
  const baseRef = useRef<number>(Date.now());
  useEffect(() => {
    baseRef.current = Date.now();
    setTick(0);
    if (!s12?.isClockTicking) return undefined;
    const id = window.setInterval(() => {
      setTick(Date.now() - baseRef.current);
    }, 100);
    return () => window.clearInterval(id);
    // Re-run whenever the Style12 identity changes.
  }, [s12]);
  return tick;
}

/**
 * Info band above/below the board. Chess Ascent's boardHeaderRow /
 * boardFooterRow shape: exactly as wide as the board (BoardLayout owns
 * that), content justified to the edges, card-styled rather than a
 * window-spanning bar. Chess Ascent puts rating/status here; ours is the
 * FICS version — player, rating, clock.
 */
function InfoBar(props: {
  side: 'opponent' | 'me';
  name: string;
  rating: string;
  clockMs: number;
  ticking: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 10px',
        background: 'var(--bg-raised)',
        border: '1px solid var(--border-soft)',
        borderRadius: 6,
        gap: 12,
        fontSize: 13,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
        <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {props.name}
        </strong>
        {props.rating && <span style={{ opacity: 0.7 }}>({props.rating})</span>}
      </span>
      <Clock ms={props.clockMs} ticking={props.ticking} />
    </div>
  );
}

function Clock({ ms, ticking }: { ms: number; ticking: boolean }) {
  const total = Math.max(0, ms);
  const totalSeconds = Math.floor(total / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const lowTime = total < 10_000;
  const tenths = lowTime ? Math.floor((total % 1000) / 100) : null;
  return (
    <span
      style={{
        fontFamily: '"SF Mono", Consolas, monospace',
        fontSize: lowTime ? 20 : 18,
        padding: '2px 10px',
        background: ticking ? (lowTime ? '#5a2a2a' : '#2a4a2a') : 'var(--bg-sunken)',
        border: `1px solid ${ticking ? (lowTime ? '#a04040' : '#3a6a3a') : 'var(--border-soft)'}`,
        color: lowTime && ticking ? '#ffd9d9' : 'inherit',
        borderRadius: 4,
        minWidth: 72,
        textAlign: 'center',
        fontWeight: lowTime ? 700 : 400,
      }}
    >
      {m}:{s.toString().padStart(2, '0')}
      {tenths !== null && <span style={{ opacity: 0.8 }}>.{tenths}</span>}
    </span>
  );
}

/**
 * Style12 piece code \u2192 Chess Ascent piece id, which is also the SVG
 * filename: `/pieces/<set>/<id>.svg`. The sets themselves are copied
 * verbatim from chessascent.app (public/pieces).
 */
const PIECE_ID: Record<number, string> = {
  1: 'wP', 2: 'wB', 3: 'wN', 4: 'wR', 5: 'wQ', 6: 'wK',
  7: 'bP', 8: 'bB', 9: 'bN', 10: 'bR', 11: 'bQ', 12: 'bK',
};

/** One piece image, Chess Ascent style: plain <img>, never draggable \u2014
 *  drag is implemented with pointer events on the board, not HTML5 DnD. */
function PieceImg({
  code,
  set,
  sizePx,
}: {
  code: number;
  set: AppPreferences['pieceSet'];
  sizePx?: number;
}) {
  const id = PIECE_ID[code];
  if (!id) return null;
  return (
    <img
      src={`/pieces/${set}/${id}.svg`}
      alt={id}
      draggable={false}
      style={{
        width: sizePx ?? '100%',
        height: sizePx ?? '100%',
        objectFit: 'contain',
        pointerEvents: 'none',
        userSelect: 'none',
        display: 'block',
      }}
    />
  );
}

/** Read preferences and keep them live: `storage` fires in this window
 *  when the options page (a different window) saves a change. */
function useLivePreferences(): AppPreferences {
  const [prefs, setPrefs] = useState<AppPreferences>(() => loadPreferences());
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key.startsWith('pref.')) setPrefs(loadPreferences());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  return prefs;
}

/**
 * Interactive board — click-to-move, highlights for last move + selection
 * + premove + check. Move sending is gated by mode:
 *   PLAYING    — sends immediately.
 *   EXAMINING  — sends immediately (FICS accepts moves in examine).
 *   everything else — click is a no-op (board is read-only).
 */
function Board({
  context,
  s12,
  gameId,
  mode,
}: {
  context: RaptorContext;
  s12: Style12Message | undefined;
  gameId: string | null;
  mode: BoardModeCode;
}) {
  const flipped = !!s12?.isWhiteOnTop;
  const interactive =
    mode === BoardMode.PLAYING || mode === BoardMode.EXAMINING;
  const canPremove = mode === BoardMode.PLAYING;

  const [selected, setSelected] = useState<string | null>(null);
  const [premove, setPremove] = useState<{ from: string; to: string } | null>(null);
  const [promotion, setPromotion] = useState<{ from: string; to: string } | null>(null);

  // Board look — Chess Ascent's themes/pieces, live-updated from the
  // options page in the main window via storage events.
  const prefs = useLivePreferences();
  const { light: lightColor, dark: darkColor } = boardColors(prefs);

  // Measured square size in px: drives coordinate-label font scaling and
  // all drag math. The board root is a perfect square (BoardLayout).
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [squareSize, setSquareSize] = useState(48);
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const measure = () => setSquareSize(el.getBoundingClientRect().width / 8);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Drag state. `pointer` tracks the gesture; `ghost` renders the piece
  // under the cursor; `dragFrom` hides the origin square's piece.
  // MIN_DRAG_DISTANCE is Chess Ascent's: below it a press stays a tap.
  const pointer = useRef<{
    downSq: string;
    piece: number;
    startX: number;
    startY: number;
    dragging: boolean;
  } | null>(null);
  const [ghost, setGhost] = useState<{ piece: number; x: number; y: number } | null>(null);
  const [dragFrom, setDragFrom] = useState<string | null>(null);

  // When it becomes our turn (relation=1 after being -1), fire any premove.
  const isMyTurn =
    s12 !== undefined &&
    (s12.relation === 1 || s12.relation === 2);
  useEffect(() => {
    if (!premove) return;
    if (!isMyTurn) return;
    // Fire it.
    sendMove(context, premove.from, premove.to);
    setPremove(null);
  }, [isMyTurn, premove, context]);

  // Reset selection if the position changes from under us.
  useEffect(() => {
    setSelected(null);
  }, [s12]);

  const lastMove = s12 ? lastMoveSquares(s12) : null;

  const kingInCheckSq = s12 && s12.san.includes('+') ? findKingSquareInCheck(s12) : null;

  /** Destination chosen (by second tap or by drop): send, queue as
   *  premove, or open the promotion picker. Shared by tap and drag. */
  function completeMoveTo(from: string, to: string) {
    const movingPiece = pieceAt(s12, from);
    const toRank = parseSquare(to)!.rank;
    if (isPawn(movingPiece) && (toRank === 0 || toRank === 7)) {
      setPromotion({ from, to });
      return;
    }
    if (isMyTurn) {
      sendMove(context, from, to);
    } else if (canPremove) {
      setPremove({ from, to });
    }
  }

  function onSquareClick(sq: string) {
    if (!interactive && !canPremove) return;
    const piece = pieceAt(s12, sq);
    // If nothing selected yet:
    if (!selected) {
      if (piece === 0) return;
      // Only allow selecting MY pieces for move origin.
      if (!pieceIsMineInStyle12(piece, s12, mode)) return;
      setSelected(sq);
      return;
    }
    // Second click — if same square, deselect.
    if (selected === sq) {
      setSelected(null);
      return;
    }
    // If second click on another of my pieces, re-select.
    if (piece !== 0 && pieceIsMineInStyle12(piece, s12, mode)) {
      setSelected(sq);
      return;
    }
    // Otherwise treat as destination.
    const from = selected;
    setSelected(null);
    completeMoveTo(from, sq);
  }

  /** Client point → square name, honoring the flip. Null outside board. */
  function squareFromPoint(clientX: number, clientY: number): string | null {
    const el = rootRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;
    const fi = Math.min(7, Math.floor((x / rect.width) * 8));
    const ri = Math.min(7, Math.floor((y / rect.height) * 8));
    const file = flipped ? 7 - fi : fi;
    const rank = flipped ? ri : 7 - ri;
    return squareName(rank, file);
  }

  // Pointer-event drag-and-drop, semantics ported from Chess Ascent's
  // gesture pipeline: a press only becomes a drag after 10px of travel,
  // so taps stay taps (and click-to-move keeps working); drop on another
  // square completes the move through the same path as a second tap.
  // Works for mouse and touch alike — touchAction:none on the root stops
  // the browser from claiming the gesture for scrolling on mobile.
  const MIN_DRAG_DISTANCE = 10;

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const sq = squareFromPoint(e.clientX, e.clientY);
    if (!sq) return;
    const piece = pieceAt(s12, sq);
    pointer.current = {
      downSq: sq,
      piece,
      startX: e.clientX,
      startY: e.clientY,
      dragging: false,
    };
    const draggable =
      (interactive || canPremove) &&
      piece !== 0 &&
      pieceIsMineInStyle12(piece, s12, mode);
    if (draggable) {
      try {
        rootRef.current?.setPointerCapture(e.pointerId);
      } catch {
        // Unknown pointerId (synthetic events, or a pointer that ended
        // between the event firing and this call). Drag still works —
        // capture only guards against losing the pointer mid-drag.
      }
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const p = pointer.current;
    if (!p) return;
    if (!p.dragging) {
      const draggable =
        (interactive || canPremove) &&
        p.piece !== 0 &&
        pieceIsMineInStyle12(p.piece, s12, mode);
      if (!draggable) return;
      const dist = Math.hypot(e.clientX - p.startX, e.clientY - p.startY);
      if (dist < MIN_DRAG_DISTANCE) return;
      p.dragging = true;
      setDragFrom(p.downSq);
    }
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    setGhost({ piece: p.piece, x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  function onPointerUp(e: React.PointerEvent) {
    const p = pointer.current;
    pointer.current = null;
    if (!p) return;
    if (p.dragging) {
      setGhost(null);
      setDragFrom(null);
      const to = squareFromPoint(e.clientX, e.clientY);
      setSelected(null);
      if (to && to !== p.downSq) {
        completeMoveTo(p.downSq, to);
      }
      return;
    }
    // No drag — a tap. Same square-click semantics as before.
    onSquareClick(p.downSq);
  }

  function onPointerCancel() {
    pointer.current = null;
    setGhost(null);
    setDragFrom(null);
  }

  function onPromotionPick(promo: 'Q' | 'R' | 'B' | 'N') {
    if (!promotion) return;
    sendMove(context, promotion.from, promotion.to, promo);
    setPromotion(null);
  }

  // Build square grid. Colors, coordinate labels and highlight palette
  // are Chess Ascent's, verbatim (components/chess/ChessBoard.tsx there).
  const coordFontSize = Math.max(7, Math.min(14, squareSize * 0.18));
  const rows: React.ReactNode[] = [];
  for (let ri = 0; ri < 8; ri++) {
    const rank = flipped ? ri : 7 - ri;
    const cols: React.ReactNode[] = [];
    for (let fi = 0; fi < 8; fi++) {
      const file = flipped ? 7 - fi : fi;
      const isLight = (rank + file) % 2 === 1;
      const sq = squareName(rank, file);
      const code = s12?.position[rank]?.[file] ?? 0;

      const isLastFrom = lastMove?.from === sq;
      const isLastTo = lastMove?.to === sq;
      const isSelected = selected === sq;
      const isPremoveFrom = premove?.from === sq;
      const isPremoveTo = premove?.to === sq;
      const isCheck = kingInCheckSq === sq;

      const baseBg = isLight ? lightColor : darkColor;
      // Chess Ascent: selected #829769; last move #ffb347/#ff8c00 by
      // square shade. Check and premove are this client's own states —
      // Chess Ascent has neither — and keep their existing colors.
      const highlight = isCheck
        ? '#d86868'
        : isPremoveFrom || isPremoveTo
          ? isLight ? '#d5b3e5' : '#8b5ba5'
          : isSelected
            ? '#829769'
            : isLastFrom || isLastTo
              ? isLight ? '#ffb347' : '#ff8c00'
              : null;

      // In-square coordinates: rank in the top-right of the rendered
      // rightmost column, file letter in the bottom-left of the rendered
      // bottom row, colored with the OPPOSITE square shade for contrast.
      const coordColor = isLight ? darkColor : lightColor;
      const showRankLabel = prefs.boardCoordinates && fi === 7;
      const showFileLabel = prefs.boardCoordinates && ri === 7;

      cols.push(
        <div
          key={`${rank}-${file}`}
          style={{
            background: highlight ?? baseBg,
            aspectRatio: '1',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
            cursor: interactive || canPremove ? 'pointer' : 'default',
            position: 'relative',
          }}
        >
          {code !== 0 && dragFrom !== sq && (
            <PieceImg code={code} set={prefs.pieceSet} />
          )}
          {showRankLabel && (
            <span style={{ ...coordLabelStyle, top: 0, right: 1, fontSize: coordFontSize, color: coordColor }}>
              {rank + 1}
            </span>
          )}
          {showFileLabel && (
            <span style={{ ...coordLabelStyle, bottom: 0, left: 1, fontSize: coordFontSize, color: coordColor }}>
              {'abcdefgh'[file]}
            </span>
          )}
        </div>,
      );
    }
    rows.push(
      <div key={rank} style={{ display: 'flex', flex: 1 }}>
        {cols}
      </div>,
    );
  }

  return (
    <div
      ref={rootRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        // Chess Ascent board chrome: 4px rounding, theme-gated shadow
        // (declared in index.css: light mode only, like the original).
        borderRadius: 4,
        overflow: 'hidden',
        boxShadow: 'var(--board-shadow)',
        // Without this, mobile browsers claim the drag for scrolling.
        touchAction: 'none',
      }}
    >
      {rows}
      {ghost && (
        <div
          style={{
            position: 'absolute',
            left: ghost.x - squareSize / 2,
            top: ghost.y - squareSize / 2,
            width: squareSize,
            height: squareSize,
            pointerEvents: 'none',
            zIndex: 6,
          }}
        >
          <PieceImg code={ghost.piece} set={prefs.pieceSet} />
        </div>
      )}
      {!s12 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 4,
            fontSize: 13,
            // Deliberately not var(--fg): this sits on top of the *board*,
            // whose squares are the same mid-to-light colours whatever the
            // theme is. var(--fg) is near-white in dark mode and would
            // vanish. Exempted by name in __tests__/themeVars.test.ts.
            color: '#15181d',
            textShadow: '0 0 6px rgba(255,255,255,0.6)',
            pointerEvents: 'none',
            fontWeight: 600,
          }}
        >
          <div>game {gameId ?? '—'}</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>
            {modeLabel(mode)} · waiting for position
          </div>
        </div>
      )}
      {premove && (
        <div
          style={{
            position: 'absolute',
            bottom: 4,
            left: 4,
            background: 'rgba(139, 91, 165, 0.85)',
            color: 'white',
            padding: '2px 8px',
            borderRadius: 3,
            fontSize: 11,
            pointerEvents: 'none',
          }}
        >
          premove: {premove.from}→{premove.to}
          <button
            onClick={() => setPremove(null)}
            style={{
              marginLeft: 6,
              pointerEvents: 'auto',
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
            }}
          >×</button>
        </div>
      )}
      {promotion && (
        <PromotionPicker
          onPick={onPromotionPick}
          onCancel={() => setPromotion(null)}
          set={prefs.pieceSet}
          asWhite={mode === BoardMode.PLAYING ? !s12?.isWhiteOnTop : true}
        />
      )}
    </div>
  );
}

const coordLabelStyle = {
  position: 'absolute',
  fontWeight: 700,
  lineHeight: 1.2,
  userSelect: 'none',
  pointerEvents: 'none',
} as const;

function PromotionPicker({
  onPick,
  onCancel,
  set,
  asWhite,
}: {
  onPick: (p: 'Q' | 'R' | 'B' | 'N') => void;
  onCancel: () => void;
  set: AppPreferences['pieceSet'];
  asWhite: boolean;
}) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          display: 'flex',
          gap: 4,
          background: 'var(--bg-raised)',
          padding: 8,
          borderRadius: 6,
          border: '1px solid var(--border-strong)',
        }}
      >
        {(['Q', 'R', 'B', 'N'] as const).map(p => (
          <button
            key={p}
            onClick={() => onPick(p)}
            style={{
              width: 56,
              height: 56,
              padding: 4,
              background: 'var(--bg-input)',
              border: '1px solid var(--border-strong)',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            <PieceImg code={promoCode(p, asWhite)} set={set} />
          </button>
        ))}
      </div>
    </div>
  );
}

/** Promotion choice \u2192 Style12 piece code for the mover's color. */
function promoCode(p: 'Q' | 'R' | 'B' | 'N', asWhite: boolean): number {
  const white = { Q: 5, R: 4, B: 2, N: 3 } as const;
  return asWhite ? white[p] : white[p] + 6;
}

function pieceAt(s12: Style12Message | undefined, sq: string): number {
  if (!s12) return 0;
  const parsed = parseSquare(sq);
  if (!parsed) return 0;
  return s12.position[parsed.rank]?.[parsed.file] ?? 0;
}

/**
 * True if `piece` belongs to the side we control. In PLAYING mode we
 * infer our color from `isWhiteOnTop`: if white is on top, we're black;
 * otherwise we're white. In EXAMINING mode either side is controllable,
 * so return true for any real piece.
 */
function pieceIsMineInStyle12(
  piece: number,
  s12: Style12Message | undefined,
  mode: BoardModeCode,
): boolean {
  if (piece === 0) return false;
  if (mode === BoardMode.EXAMINING) return true;
  if (!s12) return false;
  const iAmWhite = !s12.isWhiteOnTop;
  return iAmWhite ? isWhitePiece(piece) : isBlackPiece(piece);
}

function findKingSquareInCheck(s12: Style12Message): string | null {
  // After the SAN with '+', the king in check belongs to the side TO move
  // next (the side that has just received the check).
  const target = s12.isWhitesMoveAfterMoveIsMade ? 6 : 12; // WK or BK
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const code = s12.position[r]?.[f] ?? 0;
      if (code === target && isKing(code)) return squareName(r, f);
    }
  }
  return null;
}

/**
 * Send a move via the hidden-message path (doesn't show up as an
 * OUTBOUND chat line) — FICS accepts long-algebraic moves directly.
 */
function sendMove(
  context: RaptorContext,
  from: string,
  to: string,
  promotion?: 'Q' | 'R' | 'B' | 'N',
): void {
  const wire = `${from}${to}${promotion ? '=' + promotion : ''}`;
  context.connector.sendMessageHidden(wire);
}

function SidePanel({
  context,
  s12,
  gameId,
  mode,
}: {
  context: RaptorContext;
  s12: Style12Message | undefined;
  gameId: string | null;
  mode: BoardModeCode;
}) {
  return (
    <>
      <Section title="Last move">
        <div style={{ fontSize: 13 }}>
          {s12 ? (
            <>
              <strong>{s12.san}</strong>
              {s12.lan && s12.lan !== 'none' && (
                <span style={{ opacity: 0.7 }}> ({s12.lan})</span>
              )}
            </>
          ) : (
            <span style={{ opacity: 0.6 }}>(none)</span>
          )}
        </div>
      </Section>
      <Section title="Move">
        <div style={{ fontSize: 13 }}>
          {s12 ? (
            <>
              #{s12.fullMoveNumber} ·{' '}
              {s12.isWhitesMoveAfterMoveIsMade ? 'white to move' : 'black to move'}
            </>
          ) : (
            <span style={{ opacity: 0.6 }}>—</span>
          )}
        </div>
      </Section>
      <Section title={mode === BoardMode.BUGHOUSE_SUGGEST ? 'Holdings' : 'Captured'}>
        <div style={{ opacity: 0.6, fontSize: 12 }}>—</div>
      </Section>
      {engineAnalysisAllowed(mode) && (
        <EnginePanel context={context} gameId={gameId} />
      )}
      <Section title="Status">
        <div style={{ opacity: 0.8, fontSize: 12 }}>{modeLabel(mode)}</div>
      </Section>
    </>
  );
}

/**
 * Engine analysis section. Shows live depth/eval/PV from EngineService.
 * Only one game has the engine focused at a time — if it's not us, we
 * offer a "Focus engine here" button.
 */
function EnginePanel({
  context,
  gameId,
}: {
  context: RaptorContext;
  gameId: string | null;
}) {
  // Engine lives on the main window; popup boards reach it via context
  // (which already resolved to window.opener.raptor).
  const engine = context.engineManager;
  const [analysis, setAnalysis] = useState<EngineAnalysis | null>(
    engine?.getCurrentAnalysis() ?? null,
  );
  const [focusedGameId, setFocusedGameId] = useState<string | null>(
    engine?.getFocusedGameId() ?? null,
  );

  // Subscribe to engine updates. The callbacks fire from the main window
  // but the local React setState path keeps reactivity within this popup.
  useEffect(() => {
    if (!engine) return undefined;
    const unsubA = engine.onAnalysis(info => setAnalysis(info));
    const unsubS = engine.onState(() => setFocusedGameId(engine.getFocusedGameId()));
    // Pull initial values in case events fired before we mounted.
    setAnalysis(engine.getCurrentAnalysis());
    setFocusedGameId(engine.getFocusedGameId());
    return () => {
      unsubA();
      unsubS();
    };
  }, [engine]);

  if (!engine) {
    return (
      <Section title="Engine">
        <div style={{ opacity: 0.6, fontSize: 12 }}>(unavailable in popup)</div>
      </Section>
    );
  }

  const isFocused = gameId !== null && focusedGameId === gameId;
  const evalText = formatEval(analysis);
  return (
    <Section title="Engine">
      {!isFocused ? (
        <button
          style={focusBtn}
          onClick={() => {
            if (gameId) engine.focus(gameId);
            setFocusedGameId(engine.getFocusedGameId());
          }}
        >
          Focus engine here
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {evalText}{' '}
            {analysis && analysis.depth > 0 && (
              <span style={{ fontWeight: 400, opacity: 0.7 }}>· depth {analysis.depth}</span>
            )}
          </div>
          {analysis && analysis.pv.length > 0 && (
            <div style={{ fontSize: 11, opacity: 0.85, fontFamily: '"SF Mono", Consolas, monospace' }}>
              {analysis.pv.slice(0, 6).join(' ')}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
            <button
              style={smallBtn}
              onClick={() => engine.unfocus()}
            >
              Stop
            </button>
          </div>
        </div>
      )}
    </Section>
  );
}

function formatEval(a: EngineAnalysis | null): string {
  if (!a) return '…';
  if (a.scoreMate !== null) {
    return a.scoreMate > 0 ? `M${a.scoreMate}` : `-M${Math.abs(a.scoreMate)}`;
  }
  if (a.scoreCp === null) return '…';
  const v = a.scoreCp / 100;
  return (v >= 0 ? '+' : '') + v.toFixed(2);
}

const focusBtn = {
  padding: '4px 10px',
  background: 'var(--bg-input)',
  color: 'var(--fg)',
  border: '1px solid var(--border-strong)',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 12,
} as const;

const smallBtn = {
  padding: '2px 8px',
  background: 'transparent',
  color: 'var(--fg)',
  border: '1px solid var(--border-strong)',
  borderRadius: 3,
  cursor: 'pointer',
  fontSize: 11,
} as const;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ borderBottom: '1px solid var(--border-soft)', paddingBottom: 6 }}>
      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          opacity: 0.6,
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

/**
 * The buttons themselves live in `boardToolbar.ts` as data, so the mode →
 * buttons mapping and the dimming rule can be tested without a DOM. Every
 * item there is currently `implemented: false`, which is what makes these
 * render disabled — see that file before wiring a handler.
 */
function Toolbar({ mode }: { mode: BoardModeCode }) {
  const { left, right } = toolbarLayoutFor(mode);
  return (
    <ToolbarShell>
      {left.map((item) => (
        <TbButton key={item.id} item={item} />
      ))}
      <span style={{ flex: 1 }} />
      {right.map((item) => (
        <TbButton key={item.id} item={item} />
      ))}
    </ToolbarShell>
  );
}

function ToolbarShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        padding: 6,
        borderTop: '1px solid var(--border-soft)',
        background: 'var(--bg-raised)',
      }}
    >
      {children}
    </div>
  );
}

function TbButton({ item }: { item: ToolbarItem }) {
  const { disabled, title, style } = toolbarButtonProps(item);
  return (
    <button disabled={disabled} title={title} style={style}>
      {item.label}
    </button>
  );
}

function modeLabel(m: BoardModeCode): string {
  switch (m) {
    case BoardMode.PLAYING: return 'playing';
    case BoardMode.OBSERVING: return 'observing';
    case BoardMode.EXAMINING: return 'examining';
    case BoardMode.SETUP: return 'setup';
    case BoardMode.INACTIVE: return 'inactive';
    case BoardMode.BUGHOUSE_SUGGEST: return 'bughouse (partner)';
    default: return m;
  }
}

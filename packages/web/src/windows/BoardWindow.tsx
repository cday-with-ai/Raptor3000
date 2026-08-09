import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BoardMode,
  engineAnalysisAllowed,
  modeFromRelation,
  parseLanMove,
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
        padding: '6px 12px',
        background: 'var(--bg-raised)',
        borderBottom: props.side === 'opponent' ? '1px solid #2a2f38' : 'none',
        borderTop: props.side === 'me' ? '1px solid #2a2f38' : 'none',
        gap: 12,
        fontSize: 13,
      }}
    >
      <strong>{props.name}</strong>
      {props.rating && <span style={{ opacity: 0.7 }}>({props.rating})</span>}
      <span style={{ flex: 1 }} />
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

const PIECE_GLYPH: Record<number, string> = {
  0: '',
  1: '\u2659', 2: '\u2657', 3: '\u2658', 4: '\u2656', 5: '\u2655', 6: '\u2654',
  7: '\u265F', 8: '\u265D', 9: '\u265E', 10: '\u265C', 11: '\u265B', 12: '\u265A',
};

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

  const lastMove = s12 ? parseLanMove(s12.lan) : null;

  const kingInCheckSq = s12 && s12.san.includes('+') ? findKingSquareInCheck(s12) : null;

  function onSquareClick(sq: string) {
    if (!interactive && !canPremove) return;
    const piece = pieceAt(s12, sq);
    // If nothing selected yet:
    if (!selected) {
      if (piece === 0) return;
      // Only allow selecting MY pieces for move origin.
      if (!pieceIsMineInStyle12(piece, s12, mode)) {
        if (!canPremove) return;
        if (!pieceIsMineInStyle12(piece, s12, mode)) return;
      }
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
    // Otherwise treat as destination — send or queue as premove.
    const from = selected;
    const to = sq;
    setSelected(null);
    // Check for promotion: moving pawn to 1st/8th rank.
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

  function onPromotionPick(promo: 'Q' | 'R' | 'B' | 'N') {
    if (!promotion) return;
    sendMove(context, promotion.from, promotion.to, promo);
    setPromotion(null);
  }

  // Build square grid.
  const rows: React.ReactNode[] = [];
  for (let ri = 0; ri < 8; ri++) {
    const rank = flipped ? ri : 7 - ri;
    const cols: React.ReactNode[] = [];
    for (let fi = 0; fi < 8; fi++) {
      const file = flipped ? 7 - fi : fi;
      const dark = (rank + file) % 2 === 0;
      const sq = squareName(rank, file);
      const code = s12?.position[rank]?.[file] ?? 0;
      const glyph = PIECE_GLYPH[code] ?? '';

      const isLastFrom = lastMove?.from === sq;
      const isLastTo = lastMove?.to === sq;
      const isSelected = selected === sq;
      const isPremoveFrom = premove?.from === sq;
      const isPremoveTo = premove?.to === sq;
      const isCheck = kingInCheckSq === sq;

      const baseBg = dark ? '#6b8e95' : '#e5ecee';
      const highlight = isCheck
        ? '#d86868'
        : isPremoveFrom || isPremoveTo
          ? dark ? '#8b5ba5' : '#d5b3e5'
          : isSelected
            ? dark ? '#b98a4a' : '#ffd99a'
            : isLastFrom || isLastTo
              ? dark ? '#8b956b' : '#dfe5a5'
              : null;

      cols.push(
        <div
          key={`${rank}-${file}`}
          onClick={() => onSquareClick(sq)}
          style={{
            background: highlight ?? baseBg,
            aspectRatio: '1',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 38,
            lineHeight: 1,
            color: isWhitePiece(code) ? '#fafafa' : '#111',
            textShadow: isWhitePiece(code) ? '0 0 2px #000, 0 0 2px #000' : 'none',
            userSelect: 'none',
            cursor: interactive || canPremove ? 'pointer' : 'default',
            outline: isSelected ? '2px solid #ffbd4a' : undefined,
            outlineOffset: isSelected ? '-2px' : undefined,
            position: 'relative',
          }}
        >
          {glyph}
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
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {rows}
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
      {promotion && <PromotionPicker onPick={onPromotionPick} onCancel={() => setPromotion(null)} />}
    </div>
  );
}

function PromotionPicker({
  onPick,
  onCancel,
}: {
  onPick: (p: 'Q' | 'R' | 'B' | 'N') => void;
  onCancel: () => void;
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
          background: '#2a2f38',
          padding: 8,
          borderRadius: 6,
          border: '1px solid #4a5160',
        }}
      >
        {(['Q', 'R', 'B', 'N'] as const).map(p => (
          <button
            key={p}
            onClick={() => onPick(p)}
            style={{
              width: 48,
              height: 48,
              fontSize: 32,
              background: 'var(--bg-input)',
              color: 'var(--fg)',
              border: '1px solid #3a4150',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {promoGlyph(p)}
          </button>
        ))}
      </div>
    </div>
  );
}

function promoGlyph(p: 'Q' | 'R' | 'B' | 'N'): string {
  return { Q: '\u2655', R: '\u2656', B: '\u2657', N: '\u2658' }[p];
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
  border: '1px solid #3a4150',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 12,
} as const;

const smallBtn = {
  padding: '2px 8px',
  background: 'transparent',
  color: 'var(--fg)',
  border: '1px solid #3a4150',
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
    <div style={{ borderBottom: '1px solid #2a2f38', paddingBottom: 6 }}>
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
        borderTop: '1px solid #2a2f38',
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

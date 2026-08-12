import { observer } from 'mobx-react-lite';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  BoardMode,
  engineAnalysisAllowed,
  modeFromRelation,
  lastMoveSquares,
  parseSquare,
  squareName,
  style12ToFen,
  isWhitePiece,
  isBlackPiece,
  isPawn,
  isKing,
  GameEndType,
  type BoardModeCode,
  type GameEndMessage,
  type Style12Message,
} from '@raptor3000/shared';
import {
  formatEvalWhitePov,
  formatSanLine,
  figurine,
  premoveSan,
  pvToSan,
  replaySans,
  whiteToMoveFromFen,
} from '../game/chessBridge.js';
import { detectOpening, loadOpenings, type Opening } from '../game/openings.js';
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
  clockChipColors,
  type AppPreferences,
} from '../preferences.js';
import { saveLivePreference, useLivePreferences } from '../useLivePreferences.js';

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

  // Window-local move history (the 2026-08-12 decision — no central
  // store): ply number → SAN. Fed live from Style12 updates and seeded
  // by the `moves` response when the move list is opened.
  const [sans, setSans] = useState<ReadonlyMap<number, string>>(new Map());
  // Which ply the board is showing: null = live.
  const [viewPly, setViewPly] = useState<number | null>(null);
  // Queued premove — lifted here so its indicator can live UNDER the
  // board (Carson: overlays distract) while the Board queues/fires it.
  const [premove, setPremove] = useState<{ from: string; to: string } | null>(null);
  // Set when FICS ends the game — to the mode the window held at that
  // moment (rematch only makes sense if we were PLAYING). The parser
  // forgets the game's cached state on end, so this window's s12 is the
  // only copy of the final position — and mode/clocks must stop
  // pretending it's live.
  const [endedFrom, setEndedFrom] = useState<BoardModeCode | null>(null);
  const ended = endedFrom !== null;
  const liveModeRef = useRef<BoardModeCode>(BoardMode.OBSERVING);
  // The server's end-of-game verdict (result + description) and the
  // few seconds of theater that follow it: the result fades over the
  // board, the winning king celebrates, the losing king topples.
  const [gameEnd, setGameEnd] = useState<GameEndMessage | null>(null);
  const [theater, setTheater] = useState(false);
  useEffect(() => {
    if (!gameEnd) return undefined;
    setTheater(true);
    const t = setTimeout(() => setTheater(false), 4000);
    return () => clearTimeout(t);
  }, [gameEnd]);

  // Subscribe to GameService for THIS game's updates.
  useEffect(() => {
    if (!gameId) return undefined;
    const listener = {
      gameStateChanged: (id: string) => {
        if (id !== gameId) return;
        const latest = context.gameService.getLatestStyle12(gameId);
        if (!latest) return;
        setS12(latest);
        if (latest.san !== 'none') {
          const ply = plyOf(latest);
          setSans(prev => {
            if (prev.get(ply) === latest.san) return prev;
            const next = new Map(prev);
            // A position at ply N invalidates anything later — that's
            // what a takeback looks like from here.
            for (const k of [...next.keys()]) if (k > ply) next.delete(k);
            next.set(ply, latest.san);
            return next;
          });
        }
      },
      gameMovesAdded: (id: string) => {
        if (id !== gameId) return;
        const mm = context.gameService.getLatestMoves(gameId);
        if (!mm) return;
        setSans(prev => {
          const next = new Map(prev);
          mm.moves.forEach((san, i) => {
            if (!next.has(i + 1)) next.set(i + 1, san);
          });
          return next;
        });
      },
      gameInactive: (id: string) => {
        if (id !== gameId) return;
        // Keep the final position visible, but stop being "live":
        // freezes the clocks, flips the mode to inactive, and lets the
        // engine panel analyze the final position.
        setEndedFrom(liveModeRef.current);
        setGameEnd(context.gameService.getLatestGameEnd(gameId) ?? null);
      },
    };
    context.gameService.addListener(listener);
    const initial = context.gameService.getLatestStyle12(gameId);
    if (initial) setS12(initial);
    return () => context.gameService.removeListener(listener);
  }, [context, gameId]);

  // Replay the contiguous prefix of the history into per-ply grids —
  // grids[p] is the position after ply p. Plies beyond the replayable
  // prefix (variant games, holes before a seed arrives) aren't viewable.
  const replay = useMemo(() => {
    const list: string[] = [];
    for (let p = 1; sans.has(p); p++) list.push(sans.get(p)!);
    return replaySans(list);
  }, [sans]);

  const viewGrid =
    viewPly !== null && viewPly < replay.grids.length
      ? replay.grids[viewPly]
      : null;

  // The position the engine should be looking at: the viewed ply while
  // browsing, the live position otherwise (Carson, 2026-08-12 — "the
  // engine should focus on where we are on the board").
  const analysisFen =
    viewPly !== null
      ? replay.fens[viewPly] ?? null
      : s12
        ? style12ToFen(s12)
        : null;

  // Opening detection: longest catalogued prefix of the move history
  // (lichess chess-openings, fetched fresh at runtime). Seeding: ask for
  // the movelist once as soon as the game exists, so a mid-game join
  // still knows its opening (and the Moves control opens pre-filled).
  const [opening, setOpening] = useState<Opening | null>(null);
  const seedRequested = useRef(false);
  useEffect(() => {
    if (seedRequested.current || !gameId || !s12) return;
    seedRequested.current = true;
    context.connector.sendMessageHidden(`moves ${gameId}`);
  }, [gameId, s12, context]);
  useEffect(() => {
    let cancelled = false;
    const list: string[] = [];
    for (let p = 1; sans.has(p); p++) list.push(sans.get(p)!);
    if (list.length === 0) return undefined;
    void loadOpenings().then(table => {
      if (!cancelled) setOpening(detectOpening(table, list));
    });
    return () => {
      cancelled = true;
    };
  }, [sans]);

  // Clicking the move list focuses the engine there (Carson, 2026-08-12):
  // viewing a ply pins analysis to that position; back to live unpins.
  // For an ended game "live" is the final position, which only this
  // window still holds — hand its fen in explicitly.
  useEffect(() => {
    const em = context.engineManager;
    if (!em || !gameId) return;
    if (mode === BoardMode.PLAYING) return;
    if (viewPly !== null) {
      const fen = replay.fens[viewPly];
      // Only steer an engine that is already on (Carson: off stays off).
      if (fen && em.getFocusedGameId() === gameId) em.focusFen(gameId, fen);
    } else if (em.getFocusedGameId() === gameId) {
      if (context.gameService.getLatestStyle12(gameId)) {
        em.unpin();
      } else if (s12) {
        em.focusFen(gameId, style12ToFen(s12));
      }
    }
    // Deliberately keyed on the view alone: re-running on every live
    // move would restart the pinned search for an unchanged position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewPly]);

  const fallbackMode: BoardModeCode = useMemo(() => {
    const p = new URLSearchParams(window.location.search).get('mode');
    return isBoardMode(p) ? p : BoardMode.OBSERVING;
  }, []);

  // The final Style12 still carries the live relation and a running
  // clock flag — the game being over is signalled separately, so it
  // overrides both here.
  const mode: BoardModeCode = ended
    ? BoardMode.INACTIVE
    : s12
      ? modeFromRelation(s12.relation)
      : fallbackMode;
  if (!ended) liveModeRef.current = mode;

  // Locally-ticked clock offsets, applied to the server clocks between
  // Style12 updates. Reset on every new Style12; frozen once the game ends.
  const tick = useClockTick(ended ? undefined : s12);

  const whiteName = s12?.whiteName ?? 'white';
  const blackName = s12?.blackName ?? 'black';
  // Ratings: <g1> gameinfo when the ivariable delivered one, else the
  // `moves` header every board requests on open — which covers playing
  // and examined stored games too. Guests/UNR show nothing.
  const g1 = gameId ? context.gameService.getLatestG1(gameId) : undefined;
  const mm = gameId ? context.gameService.getLatestMoves(gameId) : undefined;
  const rating = (...cands: Array<string | undefined>) => {
    for (const r of cands) if (r && /^\d+$/.test(r)) return r;
    return '';
  };
  const whiteRating = rating(g1?.whiteRating, mm?.whiteRating);
  const blackRating = rating(g1?.blackRating, mm?.blackRating);
  const baseWhiteMs = s12?.whiteRemainingTimeMillis ?? 5 * 60 * 1000;
  const baseBlackMs = s12?.blackRemainingTimeMillis ?? 5 * 60 * 1000;
  const whiteTicking = !ended && !!(s12?.isClockTicking && s12.isWhitesMoveAfterMoveIsMade);
  const blackTicking = !ended && !!(s12?.isClockTicking && !s12?.isWhitesMoveAfterMoveIsMade);
  const whiteClock = Math.max(0, baseWhiteMs - (whiteTicking ? tick : 0));
  const blackClock = Math.max(0, baseBlackMs - (blackTicking ? tick : 0));

  // Manual flip on top of the server's orientation (the Flip button).
  const [flipOverride, setFlipOverride] = useState(false);
  const flipped = !!s12?.isWhiteOnTop !== flipOverride;

  const topName = flipped ? whiteName : blackName;
  const bottomName = flipped ? blackName : whiteName;
  const topRating = flipped ? whiteRating : blackRating;
  const bottomRating = flipped ? blackRating : whiteRating;
  const topClock = flipped ? whiteClock : blackClock;
  const bottomClock = flipped ? blackClock : whiteClock;
  const topTicking = flipped ? whiteTicking : blackTicking;
  const bottomTicking = flipped ? blackTicking : whiteTicking;

  // Closing an observed/examined board leaves the game on FICS too —
  // Raptor behavior. beforeunload also fires on a popup reload, which
  // costs one unobserve and a re-observe; closing is the common case.
  useEffect(() => {
    const onUnload = () => {
      if (!gameId || ended || !context.connector.isConnected()) return;
      if (mode === BoardMode.OBSERVING) {
        context.connector.sendMessageHidden(`unobserve ${gameId}`);
      } else if (mode === BoardMode.EXAMINING) {
        context.connector.sendMessageHidden('unexamine');
      }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [mode, ended, gameId, context]);

  // Toolbar nav: EXAMINING walks the game server-side; everything else
  // browses the window-local history (same machinery as the move list).
  const viewablePlies = replay.grids.length - 1;
  const nav = (which: 'first' | 'back' | 'forward' | 'last') => {
    if (mode === BoardMode.EXAMINING) {
      const cmd = {
        first: 'backward 999',
        back: 'backward',
        forward: 'forward',
        last: 'forward 999',
      }[which];
      context.connector.sendMessageHidden(cmd);
      return;
    }
    const current = viewPly ?? viewablePlies;
    switch (which) {
      case 'first': setViewPly(0); break;
      case 'back': setViewPly(Math.max(0, current - 1)); break;
      case 'forward': setViewPly(current + 1 >= viewablePlies ? null : current + 1); break;
      case 'last': setViewPly(null); break;
    }
  };

  const toolbarHandlers: Record<string, () => void> = {
    flip: () => setFlipOverride(o => !o),
    // PLAYING-mode one-liners.
    draw: () => context.connector.sendMessageHidden('draw'),
    abort: () => context.connector.sendMessageHidden('abort'),
    adjourn: () => context.connector.sendMessageHidden('adjourn'),
    resign: () => context.connector.sendMessageHidden('resign'),
    rematch: () => context.connector.sendMessageHidden('rematch'),
    'save-pgn': () => savePgn(s12, sans),
  };


  const prefs = useLivePreferences();

  const topBar = (
    <InfoBar side="opponent" name={topName} rating={topRating} clockMs={topClock} ticking={topTicking} prefs={prefs} />
  );
  const premoveLabel = premove
    ? (() => {
        const san = s12 ? premoveSan(style12ToFen(s12), premove.from, premove.to) : null;
        return san ? figurine(san, !s12?.isWhiteOnTop) : `${premove.from}→${premove.to}`;
      })()
    : null;
  const bottomBar = (
    <>
      {/* Reserved whenever premove is possible, so the board and bands
          never shift when one is queued (Carson) — the text just pops
          into the waiting line. */}
      {mode === BoardMode.PLAYING && (
        <div style={premoveStrip}>
          {premove ? (
            <>
              premove: <strong>{premoveLabel}</strong>
              <button onClick={() => setPremove(null)} style={premoveClear} title="clear (or right-click the board)">
                ×
              </button>
            </>
          ) : (
            <span>&nbsp;</span>
          )}
        </div>
      )}
      <InfoBar side="me" name={bottomName} rating={bottomRating} clockMs={bottomClock} ticking={bottomTicking} prefs={prefs} />
    </>
  );

  return (
    <BoardLayout
      topBar={topBar}
      bottomBar={bottomBar}
      board={
        <Board
          context={context}
          s12={s12}
          gameId={gameId}
          mode={mode}
          viewGrid={viewGrid}
          flipped={flipped}
          premove={premove}
          setPremove={setPremove}
          gameEnd={gameEnd}
          theater={theater}
        />
      }
      side={
        <SidePanel
          context={context}
          s12={s12}
          gameId={gameId}
          mode={mode}
          sans={sans}
          viewablePlies={replay.grids.length - 1}
          viewPly={viewPly}
          onViewPly={setViewPly}
          showEngine={prefs.showEngineAnalysis}
          opening={opening}
          openingFen={opening ? replay.fens[opening.plies] ?? null : null}
          analysisFen={analysisFen}
          startMovesExpanded={
            // PLAYING starts collapsed regardless of the pref (Carson):
            // just "1) … e5" until you ask for the list.
            mode !== BoardMode.PLAYING && prefs.moveListVisible
          }
          onNav={nav}
          gameEnd={gameEnd}
        />
      }
      toolbar={<Toolbar mode={mode} endedFrom={endedFrom} handlers={toolbarHandlers} />}
    />
  );
});

/**
 * Download the window's game as a .pgn file. Movetext from the
 * window-local history; result is unknown to this window (FICS's end
 * message isn't retained), so `*` — every importer accepts it.
 */
function savePgn(
  s12: Style12Message | undefined,
  sans: ReadonlyMap<number, string>,
): void {
  const moves: string[] = [];
  for (let p = 1; sans.has(p); p++) {
    if (p % 2 === 1) moves.push(`${(p + 1) / 2}.`);
    moves.push(sans.get(p)!);
  }
  const today = new Date();
  const date = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
  const pgn = [
    '[Event "FICS game"]',
    '[Site "freechess.org"]',
    `[Date "${date}"]`,
    `[White "${s12?.whiteName ?? '?'}"]`,
    `[Black "${s12?.blackName ?? '?'}"]`,
    '[Result "*"]',
    '',
    moves.join(' ') + (moves.length ? ' *' : '*'),
    '',
  ].join('\n');
  const blob = new Blob([pgn], { type: 'application/x-chess-pgn' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${s12?.whiteName ?? 'white'}-vs-${s12?.blackName ?? 'black'}.pgn`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * "blitz 3 0", "wild24 1 12" — the game's flavor for the Status line,
 * from <g1> (type + initial time/inc) with the moves header type as a
 * fallback (which lacks the clock numbers).
 */
function gameFlavor(context: RaptorContext, gameId: string | null): string | null {
  if (!gameId) return null;
  const g1 = context.gameService.getLatestG1(gameId);
  if (g1) {
    const mins = Math.round(g1.initialWhiteTimeMillis / 60000);
    const inc = Math.round(g1.initialWhiteIncMillis / 1000);
    return `${g1.gameTypeDescription} ${mins} ${inc}`.trim();
  }
  const mm = context.gameService.getLatestMoves(gameId);
  return mm?.gameType ?? null;
}

/** `1-0`, `0-1`, `½-½`, `Adjourned`, `Aborted` — the big overlay text. */
function formatResultBig(ge: GameEndMessage): string {
  switch (ge.type) {
    case GameEndType.WHITE_WON: return '1-0';
    case GameEndType.BLACK_WON: return '0-1';
    case GameEndType.DRAW: return '½-½';
    case GameEndType.ADJOURNED: return 'Adjourned';
    case GameEndType.ABORTED: return 'Aborted';
    default: return '*';
  }
}

/** The move-list line: `0-1 (GuestX forfeits on time)`. */
function formatResultLine(ge: GameEndMessage): string {
  const r = formatResultBig(ge);
  return ge.description ? `${r} (${ge.description})` : r;
}

/**
 * Which animation this king gets. Winner: dance or bow, picked
 * deterministically per game (no Math.random — same game, same show).
 * Loser: topples and stays down. Draw: everyone bows.
 */
function kingTheaterAnimation(ge: GameEndMessage, whiteKing: boolean): string | null {
  const celebrate = () => {
    const pick = parseInt(ge.gameId, 10) % 2 === 0 ? 'raptor-king-dance' : 'raptor-king-bow';
    return `${pick} 1.4s ease-in-out 2`;
  };
  switch (ge.type) {
    case GameEndType.WHITE_WON:
      return whiteKing ? celebrate() : 'raptor-king-topple 1.2s ease-in forwards';
    case GameEndType.BLACK_WON:
      return whiteKing ? 'raptor-king-topple 1.2s ease-in forwards' : celebrate();
    case GameEndType.DRAW:
      return 'raptor-king-bow 1.4s ease-in-out 2';
    default:
      return null;
  }
}

const resultOverlay = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(10, 12, 16, 0.45)',
  animation: 'raptor-result-fade 3.5s ease forwards',
  pointerEvents: 'none',
  zIndex: 8,
} as const;

const resultText = {
  fontSize: 64,
  fontWeight: 800,
  color: '#fff',
  textShadow: '0 2px 18px rgba(0,0,0,0.8)',
  letterSpacing: 2,
} as const;

/** Plies played so far, per the Style12 turn/move-number convention:
 *  fullMoveNumber is the NEXT move's number. */
function plyOf(s12: Style12Message): number {
  return (s12.fullMoveNumber - 1) * 2 + (s12.isWhitesMoveAfterMoveIsMade ? 0 : 1);
}

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
  prefs: AppPreferences;
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
      <Clock ms={props.clockMs} ticking={props.ticking} prefs={props.prefs} />
    </div>
  );
}

function Clock({
  ms,
  ticking,
  prefs,
}: {
  ms: number;
  ticking: boolean;
  prefs: AppPreferences;
}) {
  const total = Math.max(0, ms);
  const totalSeconds = Math.floor(total / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const lowTime = total < 10_000;
  const tenths = lowTime ? Math.floor((total % 1000) / 100) : null;
  // Per-state colors are preferences (Options → Board → Clock colors);
  // 'auto' resolves to the stock look, including the 2026-08-12 rule
  // that a dark ticking chip gets light text in both themes.
  const chip = clockChipColors(prefs, ticking, lowTime);
  return (
    <span
      style={{
        fontFamily: '"SF Mono", Consolas, monospace',
        fontSize: lowTime ? 20 : 18,
        padding: '2px 10px',
        background: chip.bg,
        border: `1px solid ${chip.border}`,
        color: chip.text,
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


/**
 * The piece in flight for a move animation: mounts on the source square
 * and glides to the destination (180ms, like Chess Ascent's slide).
 * Keyed by the animation id so every move gets a fresh flight.
 */
function FlightPiece({
  anim,
  flipped,
  set,
}: {
  anim: { code: number; fromSq: string; toSq: string };
  flipped: boolean;
  set: AppPreferences['pieceSet'];
}) {
  const [fly, setFly] = useState(false);
  useLayoutEffect(() => {
    // Two frames: the first commits the at-source style, the second
    // starts the transition. One frame races the style flush.
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setFly(true)),
    );
    return () => cancelAnimationFrame(raf);
  }, []);
  const cell = (sq: string) => {
    const p = parseSquare(sq)!;
    return {
      fi: flipped ? 7 - p.file : p.file,
      ri: flipped ? p.rank : 7 - p.rank,
    };
  };
  const from = cell(anim.fromSq);
  const to = cell(anim.toSq);
  return (
    <div
      style={{
        position: 'absolute',
        width: '12.5%',
        height: '12.5%',
        left: `${from.fi * 12.5}%`,
        top: `${from.ri * 12.5}%`,
        // translate % is of the piece's own box, so one square = 100%.
        transform: fly
          ? `translate(${(to.fi - from.fi) * 100}%, ${(to.ri - from.ri) * 100}%)`
          : 'translate(0, 0)',
        transition: 'transform 180ms ease',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      <PieceImg code={anim.code} set={set} />
    </div>
  );
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
  viewGrid,
  flipped,
  premove,
  setPremove,
  gameEnd,
  theater,
}: {
  context: RaptorContext;
  s12: Style12Message | undefined;
  gameId: string | null;
  mode: BoardModeCode;
  /** When set, render this historical position instead of the live one
   *  (read-only; the Moves control owns the viewing/live affordance). */
  viewGrid: number[][] | null;
  /** Orientation, including the Flip button's manual override. */
  flipped: boolean;
  premove: { from: string; to: string } | null;
  setPremove: (p: { from: string; to: string } | null) => void;
  gameEnd: GameEndMessage | null;
  theater: boolean;
}) {
  // Viewing history is read-only — moves belong to the live position.
  const viewing = viewGrid !== null;
  const interactive =
    !viewing && (mode === BoardMode.PLAYING || mode === BoardMode.EXAMINING);
  const canPremove = !viewing && mode === BoardMode.PLAYING;

  const [selected, setSelected] = useState<string | null>(null);
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
  // The last move WE sent — its server echo shouldn't animate (the
  // ghost or the optimistic hold already showed the motion).
  const lastDragRef = useRef<{ from: string; to: string; t: number } | null>(null);
  // Optimistic hold (Carson's drop-flicker report): after we send a
  // move, render the piece at its destination until the server's next
  // position lands. Cleared by any new s12 or a safety timeout.
  const [pending, setPending] = useState<{
    from: string;
    to: string;
    piece: number;
  } | null>(null);
  useEffect(() => {
    setPending(null); // any new position supersedes the guess
  }, [s12]);
  useEffect(() => {
    if (!pending) return undefined;
    const t = setTimeout(() => setPending(null), 2500); // illegal move etc.
    return () => clearTimeout(t);
  }, [pending]);

  // Move animation (the Chess Ascent slide): when a new move arrives,
  // the piece glides from its source square; the destination shows the
  // captured piece (if any) until the flight lands.
  const prevS12Ref = useRef<Style12Message | undefined>(undefined);
  const [anim, setAnim] = useState<{
    code: number;
    captured: number;
    fromSq: string;
    toSq: string;
    id: number;
  } | null>(null);
  // useLayoutEffect, deliberately: with useEffect the new position paints
  // one frame BEFORE the animation starts — the piece appears at its
  // destination, snaps back to the source, then glides. That was the
  // "shaky start" Carson saw. Layout effects run before paint, so the
  // flight and the suppressed destination commit in the same frame.
  useLayoutEffect(() => {
    const prev = prevS12Ref.current;
    prevS12Ref.current = s12;
    if (s12 === prev) return undefined;
    // A stale flight rendered against a newer grid stacks two pieces on
    // one square (Carson's premove-after-capture report) — whatever
    // happens below, the previous animation dies with its position.
    setAnim(null);
    if (!prefs.boardAnimations || !s12 || !prev) return undefined;
    const lm = lastMoveSquares(s12);
    if (!lm) return undefined;
    if (plyOf(s12) <= plyOf(prev)) return undefined; // takeback/refresh: snap
    const d = lastDragRef.current;
    if (d && d.from === lm.from && d.to === lm.to && Date.now() - d.t < 3000) {
      return undefined;
    }
    const to = parseSquare(lm.to);
    if (!to) return undefined;
    const code = s12.position[to.rank]?.[to.file] ?? 0;
    if (!code) return undefined;
    const captured = prev.position[to.rank]?.[to.file] ?? 0;
    const id = Date.now();
    setAnim({ code, captured, fromSq: lm.from, toSq: lm.to, id });
    const timer = setTimeout(() => setAnim(a => (a?.id === id ? null : a)), 240);
    return () => clearTimeout(timer);
  }, [s12, prefs.boardAnimations]);

  // When it becomes our turn (relation=1 after being -1), fire any premove.
  const isMyTurn =
    s12 !== undefined &&
    (s12.relation === 1 || s12.relation === 2);
  useEffect(() => {
    if (!premove) return;
    if (!isMyTurn) return;
    // Fire it — and mark it OURS, so the echo doesn't animate over the
    // opponent's still-flying capture (the stacked-pieces artifact).
    lastDragRef.current = { from: premove.from, to: premove.to, t: Date.now() };
    sendMove(context, premove.from, premove.to);
    setPremove(null);
  }, [isMyTurn, premove, context]);

  // Reset selection if the position changes from under us.
  useEffect(() => {
    setSelected(null);
  }, [s12]);

  // Live-position decorations don't apply to a viewed historical one.
  const lastMove = !viewing && s12 ? lastMoveSquares(s12) : null;

  const kingInCheckSq =
    !viewing && s12 && s12.san.includes('+') ? findKingSquareInCheck(s12) : null;

  const grid = viewGrid ?? s12?.position;

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
      // Our own echo neither animates nor waits: suppress the flight
      // and hold the piece at its destination until the server speaks.
      lastDragRef.current = { from, to, t: Date.now() };
      setPending({ from, to, piece: movingPiece });
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
      const code = grid?.[rank]?.[file] ?? 0;

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
            : null;
      // Last move renders as a fading tint layer instead of a painted
      // background (Carson: it should fade away).
      const lastMoveTint =
        !highlight && (isLastFrom || isLastTo)
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
          {lastMoveTint && (
            <span
              key={`lm-${s12 ? plyOf(s12) : 0}`}
              style={{
                position: 'absolute',
                inset: 0,
                background: lastMoveTint,
                animation: 'raptor-fade-out 2.5s ease-out forwards',
                pointerEvents: 'none',
              }}
            />
          )}
          {(() => {
            // While a move animates, its destination shows what was
            // captured (or nothing) until the flight lands; while OUR
            // move awaits its echo, the piece holds at its destination.
            let shown = code;
            if (!viewing && anim && sq === anim.toSq) shown = anim.captured;
            if (!viewing && pending) {
              if (sq === pending.to) shown = pending.piece;
              else if (sq === pending.from) shown = 0;
            }
            if (shown === 0 || dragFrom === sq) return null;
            // Game-end theater: the winning king celebrates, the losing
            // king topples (Carson). Draws take a bow together.
            const kingAnim =
              theater && !viewing && gameEnd && isKing(shown)
                ? kingTheaterAnimation(gameEnd, isWhitePiece(shown))
                : null;
            return kingAnim ? (
              <div style={{ width: '100%', height: '100%', animation: kingAnim }}>
                <PieceImg code={shown} set={prefs.pieceSet} />
              </div>
            ) : (
              <PieceImg code={shown} set={prefs.pieceSet} />
            );
          })()}
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
      onContextMenu={e => {
        // Right-click clears a queued premove (Carson); otherwise the
        // browser menu behaves normally.
        if (premove) {
          e.preventDefault();
          setPremove(null);
        }
      }}
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
      {!viewing && anim && (
        <FlightPiece key={anim.id} anim={anim} flipped={flipped} set={prefs.pieceSet} />
      )}
      {gameEnd && theater && !viewing && (
        <div style={resultOverlay}>
          <span style={resultText}>{formatResultBig(gameEnd)}</span>
        </div>
      )}
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

const premoveStrip = {
  fontSize: 11,
  height: 18,
  boxSizing: 'border-box',
  padding: '2px 10px',
  color: 'var(--fg-muted)',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
} as const;

const premoveClear = {
  background: 'none',
  border: 'none',
  color: 'var(--fg-muted)',
  cursor: 'pointer',
  fontSize: 12,
  padding: 0,
} as const;

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
  sans,
  viewablePlies,
  viewPly,
  onViewPly,
  showEngine,
  opening,
  openingFen,
  analysisFen,
  startMovesExpanded,
  onNav,
  gameEnd,
}: {
  context: RaptorContext;
  s12: Style12Message | undefined;
  gameId: string | null;
  mode: BoardModeCode;
  sans: ReadonlyMap<number, string>;
  viewablePlies: number;
  viewPly: number | null;
  onViewPly: (ply: number | null) => void;
  onNav: (which: 'first' | 'back' | 'forward' | 'last') => void;
  gameEnd: GameEndMessage | null;
  /** Options → Engine → "Stockfish analysis available" — finally wired. */
  showEngine: boolean;
  opening: Opening | null;
  openingFen: string | null;
  analysisFen: string | null;
  startMovesExpanded: boolean;
}) {
  // Panel structure (Carson, 2026-08-12 evening): Status pinned top,
  // Moves takes ALL the middle (scrolling inside), Engine at the bottom
  // in a FIXED, seam-adjustable slice — its line churn can no longer
  // reflow anything above it.
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [liveEngineRatio, setLiveEngineRatio] = useState<number | null>(null);
  const prefs2 = useLivePreferences();
  const engineRatio = liveEngineRatio ?? prefs2.engineSplitRatio;
  const clampEngine = (v: number) => Math.min(0.7, Math.max(0.15, v));
  const engineShown = showEngine && engineAnalysisAllowed(mode);
  return (
    <div ref={panelRef} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, gap: 6 }}>
      <div style={{ flexShrink: 0, borderBottom: '1px solid var(--border-soft)', paddingBottom: 6, fontSize: 12 }}>
        <span style={{ fontWeight: 700, opacity: 0.75 }}>Status:</span>{' '}
        <span style={{ opacity: 0.85 }}>
          {modeLabel(mode)}
          {gameFlavor(context, gameId) && (
            <span style={{ opacity: 0.8 }}> · {gameFlavor(context, gameId)}</span>
          )}
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <MovesSection
          s12={s12}
          opening={opening}
          openingFen={openingFen}
          startExpanded={startMovesExpanded}
          resultLine={gameEnd ? formatResultLine(gameEnd) : null}
          sans={sans}
          viewablePlies={viewablePlies}
          viewPly={viewPly}
          onViewPly={onViewPly}
          onNav={onNav}
        />
      </div>
      {engineShown && (
        <>
          <div
            style={engineSeam}
            title="drag to resize the engine block"
            onPointerDown={e => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setLiveEngineRatio(engineRatio);
            }}
            onPointerMove={e => {
              if (liveEngineRatio === null) return;
              const rect = panelRef.current?.getBoundingClientRect();
              if (!rect || rect.height === 0) return;
              setLiveEngineRatio(clampEngine((rect.bottom - e.clientY) / rect.height));
            }}
            onPointerUp={() => {
              if (liveEngineRatio !== null) {
                saveLivePreference('engineSplitRatio', clampEngine(liveEngineRatio));
              }
              setLiveEngineRatio(null);
            }}
            onPointerCancel={() => setLiveEngineRatio(null)}
          />
          <div style={{ flexBasis: `${(engineRatio * 100).toFixed(2)}%`, flexShrink: 0, minHeight: 0, overflowY: 'auto' }}>
            <EnginePanel context={context} gameId={gameId} fen={analysisFen} viewing={viewPly !== null} />
          </div>
        </>
      )}
    </div>
  );
}

const engineSeam = {
  height: 6,
  flexShrink: 0,
  background: 'var(--border-soft)',
  cursor: 'row-resize',
  touchAction: 'none',
} as const;

/** `26) … Rg8` — the collapsed one-line summary of where the game is. */
function lastMoveLabel(s12: Style12Message | undefined): string {
  if (!s12 || s12.san === 'none') return '(none)';
  const blackJustMoved = s12.isWhitesMoveAfterMoveIsMade;
  const num = blackJustMoved ? s12.fullMoveNumber - 1 : s12.fullMoveNumber;
  return `${num}) ${blackJustMoved ? '… ' : ''}${figurine(s12.san, !blackJustMoved)}`;
}

/** `26) … Rg8` for an arbitrary ply in the history list / view banner. */
function plyLabel(ply: number, san: string | null): string {
  const moveNo = Math.ceil(ply / 2);
  const black = ply % 2 === 0;
  return `${moveNo})${black ? ' …' : ''} ${san ? figurine(san, !black) : ''}`.trimEnd();
}

/**
 * The combined moves control (Carson's design, 2026-08-12): one line
 * showing the last move, expandable to the full move list. Expanding
 * asks FICS for `moves <id>` once to seed history from before this
 * window opened; live moves keep appending. Plies whose position the
 * chessops replay reached are clickable and show that position on the
 * board (read-only, with a "live" button to come back).
 */
function MovesSection({
  s12,
  opening,
  openingFen,
  startExpanded,
  resultLine,
  sans,
  viewablePlies,
  viewPly,
  onViewPly,
  onNav,
}: {
  s12: Style12Message | undefined;
  opening: Opening | null;
  /** "0-1 (GuestX forfeits on time)" once the game is over. */
  resultLine: string | null;
  /** Position at the end of the named book line — the study link. */
  openingFen: string | null;
  /** The moveListVisible preference — open the list without a click. */
  startExpanded: boolean;
  onNav: (which: 'first' | 'back' | 'forward' | 'last') => void;
  sans: ReadonlyMap<number, string>;
  viewablePlies: number;
  viewPly: number | null;
  onViewPly: (ply: number | null) => void;
}) {
  const [expanded, setExpanded] = useState(startExpanded);

  // History is seeded when the window opens (the opening-detection
  // seed), so expanding is pure UI.
  const toggle = () => setExpanded(e => !e);

  const maxPly = sans.size === 0 ? 0 : Math.max(...sans.keys());
  const rows: React.ReactNode[] = [];
  for (let n = 1; (n - 1) * 2 + 1 <= maxPly; n++) {
    const wPly = (n - 1) * 2 + 1;
    const bPly = wPly + 1;
    rows.push(
      <div key={n} style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
        <span style={{ opacity: 0.5, minWidth: 24, textAlign: 'right' }}>{n}.</span>
        <PlyButton ply={wPly} san={sans.get(wPly)} viewablePlies={viewablePlies} viewPly={viewPly} onViewPly={onViewPly} />
        <PlyButton ply={bPly} san={sans.get(bPly)} viewablePlies={viewablePlies} viewPly={viewPly} onViewPly={onViewPly} />
      </div>,
    );
  }

  const viewing = viewPly !== null;
  return (
    <div style={{ paddingBottom: 6 }}>
      <div
        style={{
          // One compact line, always — the 220px panel must not wrap this.
          fontSize: viewing ? 11 : 13,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        <strong style={{ opacity: 0.75, fontSize: 12, flexShrink: 0 }}>Moves:</strong>
        {viewing ? (
          <>
            <span style={{ opacity: 0.7 }}>viewing</span>
            <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {plyLabel(viewPly, sans.get(viewPly) ?? null)}
            </strong>
            <button
              onClick={() => onViewPly(null)}
              style={{
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 3,
                padding: '0 6px',
                cursor: 'pointer',
                fontSize: 10,
                fontWeight: 600,
                lineHeight: '16px',
                flexShrink: 0,
              }}
            >
              live
            </button>
          </>
        ) : (
          <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {lastMoveLabel(s12)}
          </strong>
        )}
        <button onClick={toggle} style={{ ...movelistLink, flexShrink: 0 }}>
          {expanded ? '(hide)' : '(movelist)'}
        </button>
      </div>
      {!expanded && <NavArrows onNav={onNav} />}
      {expanded && (
        <div
          // Keyboard navigation (Carson): click the list to focus it,
          // then arrow through the game. Same handlers as the buttons.
          tabIndex={0}
          onKeyDown={e => {
            const map: Record<string, 'first' | 'back' | 'forward' | 'last'> = {
              ArrowLeft: 'back',
              ArrowUp: 'back',
              ArrowRight: 'forward',
              ArrowDown: 'forward',
              Home: 'first',
              End: 'last',
            };
            const which = map[e.key];
            if (!which) return;
            e.preventDefault();
            onNav(which);
          }}
          style={{
            marginTop: 6,
            outline: 'none',
            fontSize: 13,
            fontFamily: '"SF Mono", Consolas, monospace',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          {opening && (
            <div style={{ opacity: 0.85, marginBottom: 2 }}>
              <a
                href={
                  openingFen
                    ? `https://lichess.org/analysis/${openingFen.replace(/ /g, '_')}`
                    : `https://lichess.org/analysis`
                }
                target="_blank"
                rel="noopener noreferrer"
                title={`study on lichess (book through ply ${opening.plies})`}
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                <strong>{opening.eco}</strong> {opening.name}
              </a>
            </div>
          )}
          {rows.length === 0 ? (
            <span style={{ opacity: 0.5 }}>(waiting for movelist…)</span>
          ) : (
            rows
          )}
          {resultLine && (
            <div style={{ marginTop: 3, fontWeight: 700 }}>{resultLine}</div>
          )}
        </div>
      )}
      {expanded && <NavArrows onNav={onNav} />}
    </div>
  );
}

/** ⏮ ◀ ▶ ⏭ — Moves-control navigation, all modes (server-side walk in
 *  examine, local history browse elsewhere). */
function NavArrows({ onNav }: { onNav: (w: 'first' | 'back' | 'forward' | 'last') => void }) {
  const btn = (w: 'first' | 'back' | 'forward' | 'last', label: string) => (
    <button
      key={w}
      onClick={() => onNav(w)}
      style={{
        background: 'var(--bg-input)',
        color: 'var(--fg)',
        border: '1px solid var(--border-strong)',
        borderRadius: 3,
        cursor: 'pointer',
        fontSize: 11,
        padding: '1px 8px',
      }}
    >
      {label}
    </button>
  );
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
      {btn('first', '⏮')}
      {btn('back', '◀')}
      {btn('forward', '▶')}
      {btn('last', '⏭')}
    </div>
  );
}

function PlyButton({
  ply,
  san,
  viewablePlies,
  viewPly,
  onViewPly,
}: {
  ply: number;
  san: string | undefined;
  viewablePlies: number;
  viewPly: number | null;
  onViewPly: (ply: number | null) => void;
}) {
  if (!san) return <span style={{ minWidth: 52 }} />;
  const shownSan = figurine(san, ply % 2 === 1);
  const clickable = ply <= viewablePlies;
  const active = viewPly === ply;
  // The final ply IS the live position — selecting it means live
  // (Carson): keep following new moves, no read-only viewing state.
  const target = ply === viewablePlies ? null : ply;
  return (
    <button
      onClick={clickable ? () => onViewPly(active ? null : target) : undefined}
      title={clickable ? undefined : 'position not replayable (gap or variant)'}
      style={{
        background: active ? 'var(--accent-soft)' : 'transparent',
        color: clickable ? 'var(--fg)' : 'var(--fg-dim)',
        border: 'none',
        borderRadius: 3,
        padding: '0 4px',
        minWidth: 52,
        textAlign: 'left',
        cursor: clickable ? 'pointer' : 'default',
        fontFamily: 'inherit',
        fontSize: 'inherit',
      }}
    >
      {shownSan}
    </button>
  );
}

const movelistLink = {
  background: 'none',
  border: 'none',
  color: 'var(--accent)',
  cursor: 'pointer',
  fontSize: 12,
  padding: 0,
} as const;

/**
 * Engine analysis section. Shows live depth/eval/PV from EngineService.
 * Only one game has the engine focused at a time — if it's not us, we
 * offer a "Focus engine here" button.
 */
function EnginePanel({
  context,
  gameId,
  fen,
  viewing,
}: {
  context: RaptorContext;
  gameId: string | null;
  /** The position being looked at — the viewed ply while browsing. */
  fen: string | null;
  viewing: boolean;
}) {
  // (best line) shows one PV; (multi line) searches and shows three.
  const [lineMode, setLineMode] = useState<'best' | 'multi'>('best');
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
  // Eval and lines are always shown from White's perspective — the
  // convention every engine GUI uses. UCI reports side-to-move, so the
  // flip needs the analyzed position's turn.
  const whiteToMove = fen ? whiteToMoveFromFen(fen) : true;
  const lines = analysis?.lines ?? [];
  const shown = lineMode === 'best' ? lines.slice(0, 1) : lines.slice(0, 3);

  // The mode links double as the on-switch (Carson): clicking either
  // while off focuses the engine here in that mode. A live game follows
  // updates via focus(); an ended game's state was forgotten
  // service-side, so its final position goes in as a fen.
  const engageIn = (m: 'best' | 'multi') => {
    if (!gameId) return;
    setLineMode(m);
    engine.setMultiPv(m === 'multi' ? 3 : 1);
    if (!isFocused) {
      if (viewing && fen) {
        // Engage on the position being looked at, pinned there.
        engine.focusFen(gameId, fen);
      } else if (context.gameService.getLatestStyle12(gameId)) {
        engine.focus(gameId);
      } else if (fen) {
        // Ended game: the final position, held only by this window.
        engine.focusFen(gameId, fen);
      }
      setFocusedGameId(engine.getFocusedGameId());
    }
  };

  const modeLink = (m: 'best' | 'multi', label: string) => (
    <button
      style={{
        ...inlineLink,
        fontWeight: isFocused && lineMode === m ? 700 : 400,
      }}
      onClick={() => engageIn(m)}
    >
      ({isFocused && lineMode === m ? '*' : ''}{label})
    </button>
  );

  // Layout per Carson: when on, line 1 is "Engine: +0.29 d16 (off)" and
  // line 2 the mode links with the active one starred; when off, one
  // line — "Engine: (best line) (multi line)".
  return (
    <div style={{ paddingBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 12 }}>
        <strong style={{ opacity: 0.75 }}>Engine:</strong>
        {isFocused ? (
          <>
            <span style={{ fontSize: 14, fontWeight: 700 }}>
              {analysis
                ? formatEvalWhitePov(analysis.scoreCp, analysis.scoreMate, whiteToMove)
                : '…'}
              {analysis && analysis.depth > 0 && (
                <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.7 }}>
                  {' '}
                  d{analysis.depth}
                </span>
              )}
            </span>
            <button
              style={inlineLink}
              onClick={() => {
                engine.userDisable();
                setFocusedGameId(engine.getFocusedGameId());
              }}
            >
              (off)
            </button>
          </>
        ) : (
          <>
            {modeLink('best', 'best line')}
            {modeLink('multi', 'multi line')}
          </>
        )}
      </div>
      {isFocused && (
        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
          {modeLink('multi', 'multi line')}
          {modeLink('best', 'best line')}
        </div>
      )}
      {isFocused &&
        shown.map(line => {
          const san = fen ? pvToSan(fen, line.pv) : null;
          return (
            <div
              key={line.multipv}
              style={{
                fontSize: 11,
                opacity: 0.9,
                fontFamily: '"SF Mono", Consolas, monospace',
                marginTop: 3,
              }}
            >
              {lineMode === 'multi' && (
                <strong style={{ marginRight: 6 }}>
                  {formatEvalWhitePov(line.scoreCp, line.scoreMate, whiteToMove)}
                </strong>
              )}
              {san ? formatSanLine(san) : line.pv.slice(0, 8).join(' ')}
            </div>
          );
        })}
    </div>
  );
}

// The (focus engine here) one-liner — same voice as (movelist).
const inlineLink = {
  background: 'none',
  border: 'none',
  color: 'var(--accent)',
  cursor: 'pointer',
  fontSize: 12,
  padding: 0,
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
          fontSize: 12,
          fontWeight: 700,
          opacity: 0.75,
          marginBottom: 4,
        }}
      >
        {title}:
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
function Toolbar({
  mode,
  endedFrom,
  handlers,
}: {
  mode: BoardModeCode;
  endedFrom: BoardModeCode | null;
  handlers: Record<string, () => void>;
}) {
  const { left, right } = toolbarLayoutFor(mode, { endedFrom });
  return (
    <ToolbarShell>
      {left.map((item) => (
        <TbButton key={item.id} item={item} onClick={handlers[item.id]} />
      ))}
      <span style={{ flex: 1 }} />
      {right.map((item) => (
        <TbButton key={item.id} item={item} onClick={handlers[item.id]} />
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

function TbButton({
  item,
  onClick,
}: {
  item: ToolbarItem;
  onClick?: () => void;
}) {
  // `implemented` claims a handler exists; a missing one here means the
  // flag was flipped without wiring — render it dead rather than lie.
  const effective = onClick ? item : { ...item, implemented: false };
  const { disabled, title, style } = toolbarButtonProps(effective);
  return (
    <button disabled={disabled} title={title} style={style} onClick={onClick}>
      {item.label}
    </button>
  );
}

function modeLabel(m: BoardModeCode): string {
  switch (m) {
    case BoardMode.PLAYING: return 'Playing';
    case BoardMode.OBSERVING: return 'Observing';
    case BoardMode.EXAMINING: return 'Examining';
    case BoardMode.SETUP: return 'Setup';
    case BoardMode.INACTIVE: return 'Inactive';
    case BoardMode.BUGHOUSE_SUGGEST: return 'Bughouse (partner)';
    default: return m;
  }
}

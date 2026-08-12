import {
  BoardMode,
  style12ToFen,
  type GameService,
  type GameServiceListener,
} from '@raptor3000/shared';
import {
  EngineService,
  type EngineAnalysis,
  type EngineState,
} from './EngineService.js';

/**
 * EngineManager — bridges GameService lifecycle to the engine.
 *
 * Rules:
 *   - PLAYING:    never analyze (anti-cheat).
 *   - OBSERVING:  analyze the active game live.
 *   - EXAMINING:  analyze the active game on every position update.
 *   - INACTIVE:   analyze the final position once (game-over review).
 *
 * Only ONE game is analyzed at a time — switching focus stops the old
 * analysis and starts the new one. Callers can subscribe to a focused
 * game's analysis stream via `onAnalysis`.
 */
export class EngineManager {
  private readonly engine = new EngineService();
  private readonly gameService: GameService;
  private readonly listener: GameServiceListener;
  private focusedGameId: string | null = null;
  private pinnedFen: string | null = null;
  private disposed = false;

  constructor(gameService: GameService) {
    this.gameService = gameService;
    this.listener = {
      onObsGameStart: id => this.focusIfAnalyzable(id, BoardMode.OBSERVING),
      onObsGameEnd: id => this.unfocusIfMatch(id),
      onExGameStart: id => this.focusIfAnalyzable(id, BoardMode.EXAMINING),
      onExGameEnd: id => this.unfocusIfMatch(id),
      onPlayingGameStart: id => {
        // If we were analyzing this game in some prior mode, stop now.
        if (this.focusedGameId === id) this.unfocus();
      },
      onPlayingGameEnd: id => {
        // Game over — if we now have a final position, analyze it.
        this.focusIfAnalyzable(id, BoardMode.INACTIVE);
      },
      gameStateChanged: id => {
        // Live position update for the focused game → re-analyze.
        if (id === this.focusedGameId) this.refresh();
      },
      gameInactive: id => {
        // If the focused game ended outside a known transition (e.g. a
        // disconnect), do a one-off analysis of the last position.
        if (id === this.focusedGameId) this.refresh();
      },
    };
    gameService.addListener(this.listener);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.gameService.removeListener(this.listener);
    this.engine.stop();
  }

  /** How many lines the engine searches (MultiPV). Restarts analysis. */
  setMultiPv(n: number): void {
    this.engine.setMultiPv(n);
  }

  getMultiPv(): number {
    return this.engine.getMultiPv();
  }

  /** The game currently being analyzed, or null. */
  getFocusedGameId(): string | null {
    return this.focusedGameId;
  }

  /** Subscribe to live engine analysis updates. */
  onAnalysis(cb: (info: EngineAnalysis) => void): () => void {
    return this.engine.onAnalysis(cb);
  }

  /** Subscribe to engine lifecycle state changes. */
  onState(cb: (state: EngineState) => void): () => void {
    return this.engine.onState(cb);
  }

  getEngineState(): EngineState {
    return this.engine.getState();
  }

  getCurrentAnalysis(): EngineAnalysis | null {
    return this.engine.getCurrentAnalysis();
  }

  /**
   * Manually focus a game for analysis (e.g. user clicked a board window).
   * Honors the same anti-cheat gate as automatic focus.
   */
  focus(gameId: string): void {
    const mode = this.gameService.getMode(gameId);
    if (!mode || mode === BoardMode.PLAYING) return;
    this.pinnedFen = null;
    this.focusedGameId = gameId;
    this.engine.start();
    this.refresh();
  }

  /**
   * Analyze a specific position for a game, pinned: live updates stop
   * re-analyzing until `unpin()` or another focusFen. This is how the
   * move-list click works (analyze the viewed ply) and how an ENDED
   * game gets analysis at all — game end forgets the game's cached
   * state, so the final position exists only window-locally and has to
   * be handed in as a fen. `getMode` returning undefined therefore
   * passes the gate here; only a live PLAYING game is refused.
   */
  focusFen(gameId: string, fen: string): void {
    const mode = this.gameService.getMode(gameId);
    if (mode === BoardMode.PLAYING) return;
    this.focusedGameId = gameId;
    this.pinnedFen = fen;
    this.engine.start();
    this.engine.analyze(fen, { depth: 18 });
  }

  /** Drop the pin and go back to following the live position. */
  unpin(): void {
    this.pinnedFen = null;
    this.refresh();
  }

  /** Stop analyzing the focused game and idle the engine search. */
  unfocus(): void {
    this.focusedGameId = null;
    this.pinnedFen = null;
    this.engine.pause();
  }

  // ---- internals ----

  private focusIfAnalyzable(gameId: string, mode: typeof BoardMode[keyof typeof BoardMode]): void {
    if (mode === BoardMode.PLAYING) return;
    this.focusedGameId = gameId;
    this.engine.start();
    this.refresh();
  }

  private unfocusIfMatch(gameId: string): void {
    if (this.focusedGameId === gameId) this.unfocus();
  }

  private refresh(): void {
    if (!this.focusedGameId) return;
    // A pinned position doesn't move when the live game does.
    if (this.pinnedFen) return;
    const s12 = this.gameService.getLatestStyle12(this.focusedGameId);
    if (!s12) return;
    const fen = style12ToFen(s12);
    this.engine.analyze(fen, { depth: 18 });
  }
}

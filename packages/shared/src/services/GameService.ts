import type { Offer } from '../models/Offer.js';
import type { GameInfo } from '../models/GameInfo.js';
import type { Style12Message } from '../models/messages/Style12Message.js';
import type { G1Message } from '../models/messages/G1Message.js';
import type { B1Message } from '../models/messages/B1Message.js';
import type { MovesMessage } from '../models/messages/MovesMessage.js';
import type { GameEndMessage } from '../models/messages/GameEndMessage.js';
import { BoardMode, modeFromRelation, type BoardModeCode } from '../models/BoardMode.js';

/**
 * Game-side event bus. Parity with raptor/service/GameService.java's public
 * fire* methods and GameServiceListener callbacks.
 *
 * Design: listener interface is fat (one method per event type) — matches
 * Raptor exactly, and is clearer than a single polymorphic handler for
 * per-method optimization (e.g. GAME_STATE_CHANGED is very high-frequency).
 *
 * Game events are keyed by gameId (except GAME_INFO_CHANGED / OFFER_*)
 * so listeners can register interest per-game.
 */

export interface GameServiceListener {
  /** Called when a droppable game's piece holdings change. */
  droppablePiecesChanged?(gameId: string): void;

  /** Called when an examined game transitions to setup mode. */
  examinedGameBecameSetup?(gameId: string): void;

  /** Called when a new game is created in the registry. */
  gameCreated?(gameId: string): void;

  /** Called when a game becomes inactive (ended, unobserved). */
  gameInactive?(gameId: string): void;

  /** Called when the public games list changes. */
  gameInfoChanged?(gameInfos: readonly GameInfo[]): void;

  /** Called when a game's move history was populated (e.g. `moves` response). */
  gameMovesAdded?(gameId: string): void;

  /**
   * Called on every Style12 update. `isNewMove=true` means a move was just
   * made; `false` means a clock-tick / non-move update.
   */
  gameStateChanged?(gameId: string, isNewMove: boolean): void;

  /** Called when the server rejects a move. */
  illegalMove?(gameId: string, move: string): void;

  /** Called when an observed game transitions to examined. */
  observedGameBecameExamined?(gameId: string): void;

  /** Called when the user issues an offer. */
  offerIssued?(offer: Offer): void;

  /** Called when the user receives an offer. */
  offerReceived?(offer: Offer): void;

  /** Called when an offer is removed (accepted/declined/withdrawn/expired). */
  offerRemoved?(offer: Offer): void;

  /** Called when a setup game transitions to examined (user finished setup). */
  setupGameBecameExamined?(gameId: string): void;

  // ---- mode-aware lifecycle hooks (fire alongside gameCreated/gameInactive) ----
  //
  // These fire AFTER the first Style12 is recorded for a game (so the mode
  // is known), and BEFORE the generic gameInactive on game end. Override
  // whichever ones you care about — easy to customize per mode.

  /** Fires when the user starts playing a game. */
  onPlayingGameStart?(gameId: string): void;
  /** Fires when a playing game ends (checkmate/resign/draw/disconnect). */
  onPlayingGameEnd?(gameId: string): void;

  /** Fires when the user starts observing a live game. */
  onObsGameStart?(gameId: string): void;
  /** Fires when an observed game ends or the user unobserves. */
  onObsGameEnd?(gameId: string): void;

  /** Fires when the user enters examine mode on a game. */
  onExGameStart?(gameId: string): void;
  /** Fires when the user leaves examine mode. */
  onExGameEnd?(gameId: string): void;

  /** Fires when a game enters setup mode (`bsetup`). */
  onSetupGameStart?(gameId: string): void;
  /** Fires when a setup game exits setup mode. */
  onSetupGameEnd?(gameId: string): void;
}

export class GameService {
  private readonly listeners = new Set<GameServiceListener>();
  private readonly offers = new Map<string, Offer>();
  private readonly latestStyle12 = new Map<string, Style12Message>();
  private readonly latestG1 = new Map<string, G1Message>();
  private readonly latestB1 = new Map<string, B1Message>();
  private readonly latestMoves = new Map<string, MovesMessage>();
  private readonly latestGameEnd = new Map<string, GameEndMessage>();
  /** Current derived mode per game — tracked so lifecycle hooks know
   *  which end-event to fire, and so mode transitions (obs→examine)
   *  can be detected without consumers re-deriving from the relation. */
  private readonly modes = new Map<string, BoardModeCode>();
  /** Games for which we've already fired an `on<Mode>GameStart` hook.
   *  Used to suppress duplicate start-events on subsequent Style12 updates. */
  private readonly startedGames = new Set<string>();

  /** Most recent Style12 for the game, or undefined if we haven't seen one. */
  getLatestStyle12(gameId: string): Style12Message | undefined {
    return this.latestStyle12.get(gameId);
  }

  getLatestG1(gameId: string): G1Message | undefined {
    return this.latestG1.get(gameId);
  }

  getLatestB1(gameId: string): B1Message | undefined {
    return this.latestB1.get(gameId);
  }

  /** Current mode for the game, or undefined if no Style12 recorded yet. */
  getMode(gameId: string): BoardModeCode | undefined {
    return this.modes.get(gameId);
  }

  /**
   * Called by FicsParser before fireGameStateChanged. Derives mode from
   * Style12 relation and, if it differs from the prior mode, fires the
   * appropriate end-then-start transition hooks (e.g. obs→ex when
   * someone examines a game you were observing).
   */
  /**
   * Store the parsed `moves` response so consumers woken by
   * `gameMovesAdded` can read it — same latest-cache pattern as
   * Style12/G1/B1. Before 2026-08-12 the parser fired the event and
   * dropped the message, so the history was announced but unreadable.
   */
  recordMoves(msg: MovesMessage): void {
    this.latestMoves.set(msg.gameId, msg);
  }

  /** The end-of-game message, kept PAST forgetGame — the result overlay
   *  and the move-list result line read it after the game is gone. */
  recordGameEnd(msg: GameEndMessage): void {
    this.latestGameEnd.set(msg.gameId, msg);
  }

  getLatestGameEnd(gameId: string): GameEndMessage | undefined {
    return this.latestGameEnd.get(gameId);
  }

  getLatestMoves(gameId: string): MovesMessage | undefined {
    return this.latestMoves.get(gameId);
  }

  recordStyle12(msg: Style12Message): void {
    this.latestStyle12.set(msg.gameId, msg);
    const nextMode = modeFromRelation(msg.relation);
    const prevMode = this.modes.get(msg.gameId);
    this.modes.set(msg.gameId, nextMode);

    // Mode transition (e.g. observed → examined): emit the end-of-old
    // immediately so transition order is clean (end-before-start). The
    // paired start-of-new fires on the next fireGameStateChanged /
    // fireGameCreated, which the parser always calls right after.
    if (
      prevMode !== undefined &&
      prevMode !== nextMode &&
      this.startedGames.has(msg.gameId)
    ) {
      this.fireGameEndForMode(msg.gameId, prevMode);
      this.startedGames.delete(msg.gameId);
    }
  }

  recordG1(msg: G1Message): void {
    this.latestG1.set(msg.gameId, msg);
  }

  recordB1(msg: B1Message): void {
    this.latestB1.set(msg.gameId, msg);
  }

  /** Drop cached state for a game (e.g. on GAME_INACTIVE). */
  forgetGame(gameId: string): void {
    this.latestStyle12.delete(gameId);
    this.latestG1.delete(gameId);
    this.latestB1.delete(gameId);
    this.modes.delete(gameId);
    this.startedGames.delete(gameId);
  }

  addListener(l: GameServiceListener): void {
    this.listeners.add(l);
  }

  removeListener(l: GameServiceListener): void {
    this.listeners.delete(l);
  }

  // ---- emitters (parity with Raptor's fire* methods) ----

  fireDroppablePiecesChanged(gameId: string): void {
    for (const l of this.listeners) l.droppablePiecesChanged?.(gameId);
  }

  fireExaminedGameBecameSetup(gameId: string): void {
    for (const l of this.listeners) l.examinedGameBecameSetup?.(gameId);
  }

  /**
   * Fires the generic gameCreated for all listeners, AND — if we already
   * know the mode (Style12 has been recorded) — the mode-specific
   * `on<Mode>GameStart` hook. Safe to call multiple times; the mode-specific
   * hook is only fired once per (gameId, mode) tuple.
   */
  fireGameCreated(gameId: string): void {
    for (const l of this.listeners) l.gameCreated?.(gameId);
    this.maybeFireModeStart(gameId);
  }

  /**
   * Fires the mode-specific end hook (if mode is known) THEN the generic
   * gameInactive. Consumers can rely on end-before-generic ordering.
   */
  fireGameInactive(gameId: string): void {
    const mode = this.modes.get(gameId);
    if (mode !== undefined && this.startedGames.has(gameId)) {
      this.fireGameEndForMode(gameId, mode);
    }
    for (const l of this.listeners) l.gameInactive?.(gameId);
  }

  /**
   * Attempts to fire the mode-specific start hook. Called after both
   * `recordStyle12` (mode populated) and `fireGameCreated` (UI ready).
   * Idempotent per (gameId, mode) — a repeat Style12 in the same mode is
   * a no-op here.
   */
  private maybeFireModeStart(gameId: string): void {
    const mode = this.modes.get(gameId);
    if (mode === undefined) return;
    if (this.startedGames.has(gameId)) return;
    this.startedGames.add(gameId);
    switch (mode) {
      case BoardMode.PLAYING:
        for (const l of this.listeners) l.onPlayingGameStart?.(gameId);
        break;
      case BoardMode.OBSERVING:
        for (const l of this.listeners) l.onObsGameStart?.(gameId);
        break;
      case BoardMode.EXAMINING:
        for (const l of this.listeners) l.onExGameStart?.(gameId);
        break;
      case BoardMode.SETUP:
        for (const l of this.listeners) l.onSetupGameStart?.(gameId);
        break;
      case BoardMode.INACTIVE:
      case BoardMode.BUGHOUSE_SUGGEST:
        // No dedicated start hook for these — the generic gameCreated is
        // sufficient. Still mark as started so a follow-up INACTIVE
        // doesn't fire an end-without-start.
        break;
    }
  }

  private fireGameEndForMode(gameId: string, mode: BoardModeCode): void {
    switch (mode) {
      case BoardMode.PLAYING:
        for (const l of this.listeners) l.onPlayingGameEnd?.(gameId);
        break;
      case BoardMode.OBSERVING:
        for (const l of this.listeners) l.onObsGameEnd?.(gameId);
        break;
      case BoardMode.EXAMINING:
        for (const l of this.listeners) l.onExGameEnd?.(gameId);
        break;
      case BoardMode.SETUP:
        for (const l of this.listeners) l.onSetupGameEnd?.(gameId);
        break;
      case BoardMode.INACTIVE:
      case BoardMode.BUGHOUSE_SUGGEST:
        break;
    }
  }

  fireGameInfoChanged(gameInfos: readonly GameInfo[]): void {
    for (const l of this.listeners) l.gameInfoChanged?.(gameInfos);
  }

  fireGameMovesAdded(gameId: string): void {
    for (const l of this.listeners) l.gameMovesAdded?.(gameId);
  }

  fireGameStateChanged(gameId: string, isNewMove: boolean): void {
    for (const l of this.listeners) l.gameStateChanged?.(gameId, isNewMove);
    // Post-state-change, the mode may have just been populated by a prior
    // recordStyle12 call. Fire the mode-specific start hook if we haven't
    // yet — no-op if already started in this mode.
    this.maybeFireModeStart(gameId);
  }

  fireIllegalMove(gameId: string, move: string): void {
    for (const l of this.listeners) l.illegalMove?.(gameId, move);
  }

  fireObservedGameBecameExamined(gameId: string): void {
    for (const l of this.listeners) l.observedGameBecameExamined?.(gameId);
  }

  fireOfferIssued(offer: Offer): void {
    this.offers.set(offer.id, offer);
    for (const l of this.listeners) l.offerIssued?.(offer);
  }

  fireOfferReceived(offer: Offer): void {
    this.offers.set(offer.id, offer);
    for (const l of this.listeners) l.offerReceived?.(offer);
  }

  /**
   * Takes an offer id (matching Raptor's asymmetry: fire takes id,
   * listener callback receives the full Offer object).
   */
  fireOfferRemoved(id: string): void {
    const offer = this.offers.get(id);
    this.offers.delete(id);
    if (offer) {
      for (const l of this.listeners) l.offerRemoved?.(offer);
    }
  }

  fireSetupGameBecameExamined(gameId: string): void {
    for (const l of this.listeners) l.setupGameBecameExamined?.(gameId);
  }

  getOffer(id: string): Offer | undefined {
    return this.offers.get(id);
  }

  getOffers(): readonly Offer[] {
    return [...this.offers.values()];
  }
}

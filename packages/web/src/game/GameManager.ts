import {
  ChatEventType,
  makeChatEvent,
  type ChatService,
  type GameService,
  type GameServiceListener,
} from '@raptor3000/shared';
import type { WindowManager } from '../windows/WindowManager.js';

/**
 * GameManager — owns the lifecycle of board windows.
 *
 * Listens to GameService lifecycle hooks and opens / closes / focuses
 * board windows per game. Replaces the ad-hoc `gameCreated` listener
 * that used to live in MainWindow.tsx.
 *
 * **Customization surface.** Each `on*GameStart` / `on*GameEnd` method
 * is overridable — subclass `GameManager` and change behavior per mode
 * without touching GameService or the parser. Typical customizations:
 *   - Play a sound on `onPlayingGameStart` only (not observed games).
 *   - Auto-join a commentary channel when observing.
 *   - Skip window-opening for bughouse partner boards that are suggest-only.
 *
 * Raptor parallel: this is the browser equivalent of `IcsConnector`'s
 * inline `GameServiceAdapter` + `IcsUtils.buildController` + `ChessBoardUtils.openBoard`.
 */
export class GameManager {
  private readonly openGames = new Set<string>();
  private disposed = false;
  private readonly listener: GameServiceListener;

  constructor(
    private readonly gameService: GameService,
    private readonly windowManager: WindowManager,
  ) {
    // Route listener callbacks back to the overridable methods on `this`
    // so subclasses can change behavior by overriding the protected hook
    // methods rather than having to re-register the listener.
    this.listener = {
      onPlayingGameStart: id => this.onPlayingGameStart(id),
      onPlayingGameEnd: id => this.onPlayingGameEnd(id),
      onObsGameStart: id => this.onObsGameStart(id),
      onObsGameEnd: id => this.onObsGameEnd(id),
      onExGameStart: id => this.onExGameStart(id),
      onExGameEnd: id => this.onExGameEnd(id),
      onSetupGameStart: id => this.onSetupGameStart(id),
      onSetupGameEnd: id => this.onSetupGameEnd(id),
    };
    this.gameService.addListener(this.listener);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.gameService.removeListener(this.listener);
  }

  /** Current set of games this manager has an open window for. */
  getOpenGameIds(): ReadonlySet<string> {
    return this.openGames;
  }

  // ---- mode-specific lifecycle hooks (override these) ----

  /** Playing our own game — full interactive board + play controls. */
  onPlayingGameStart(gameId: string): void {
    this.openBoardWindow(gameId);
  }
  onPlayingGameEnd(gameId: string): void {
    // Keep window open for post-mortem / rematch. User closes manually.
    void gameId;
  }

  /** Observing a live game — read-only board + engine allowed. */
  onObsGameStart(gameId: string): void {
    this.openBoardWindow(gameId);
  }
  onObsGameEnd(gameId: string): void {
    // Keep window open so user can review final position; they'll close
    // it via `unobserve` or the window's close button.
    void gameId;
  }

  /** Entered examine mode — free navigation + variations. */
  onExGameStart(gameId: string): void {
    this.openBoardWindow(gameId);
  }
  onExGameEnd(gameId: string): void {
    // When leaving examine via `unexamine`, close the window.
    this.closeBoardWindow(gameId);
  }

  /** Entered setup mode — piece placement. */
  onSetupGameStart(gameId: string): void {
    this.openBoardWindow(gameId);
  }
  onSetupGameEnd(gameId: string): void {
    // Setup → examined transition keeps window open; the next lifecycle
    // event will be onExGameStart.
    void gameId;
  }

  // ---- helpers ----

  /**
   * Open a board window for `gameId`. Safe to call twice; WindowManager
   * will focus the existing window on a repeat invocation.
   */
  protected openBoardWindow(gameId: string): void {
    if (this.disposed) return;
    this.openGames.add(gameId);
    const win = this.windowManager.open({ kind: 'board', id: gameId });
    if (!win) {
      // Board windows are popups, and they are opened in response to a `<12>`
      // arriving from the server — which is not a user gesture, so browsers
      // block them by default. The return value used to be discarded, making a
      // blocked popup identical to a broken board: `obs 25` succeeds, the game
      // registers as open, and nothing appears or complains.
      this.onBoardWindowBlocked?.(gameId);
       
      console.warn(
        `[GameManager] board window for game ${gameId} was blocked by the browser. ` +
          `Allow popups for this origin, or open it from a click.`,
      );
    }
  }

  /** Set by the host app to surface a blocked popup to the user.
   *  See `announceBlockedBoardWindows` for the standard wiring. */
  onBoardWindowBlocked?: (gameId: string) => void;

  /**
   * Close a board window for `gameId`. Safe if the window is already
   * closed or never opened.
   */
  protected closeBoardWindow(gameId: string): void {
    this.openGames.delete(gameId);
    this.windowManager.close({ kind: 'board', id: gameId });
  }
}

/** The text a user sees when a board popup never appeared. */
export function blockedBoardWindowMessage(gameId: string): string {
  return (
    `Board window for game ${gameId} was blocked by the browser. ` +
    `Allow popups for this site, then re-issue the command.`
  );
}

/**
 * Route a GameManager's blocked-popup hook to the chat console.
 *
 * `onBoardWindowBlocked` was a hook nobody assigned: the blocked case wrote a
 * `console.warn` and nothing else, so answering "is the popup being blocked?"
 * meant having devtools open *before* the `obs` that triggered it. The same
 * INTERNAL-event channel that surfaces FICS setting rejections carries this,
 * and the main console tab accepts everything, so the answer now lands in the
 * app itself — which is the whole content of the popup hypothesis.
 */
export function announceBlockedBoardWindows(
  gameManager: GameManager,
  chatService: ChatService,
): void {
  gameManager.onBoardWindowBlocked = gameId => {
    const message = blockedBoardWindowMessage(gameId);
    chatService.publish(
      makeChatEvent(ChatEventType.INTERNAL, message, { message, gameId }),
    );
  };
}

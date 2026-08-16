import { action, computed, makeObservable, observable } from 'mobx';
import { ChatEventType, type ChatService, type ChatEvent } from '@raptor3000/shared';

/**
 * GameWindowMachine — decides which board window a game belongs to, and
 * labels the follow window.
 *
 * FICS gives no hint that a Style12 is a follow game: `follow <handle>`
 * and `follow /b` open the next game the same way `observe` does, and the
 * server tags nothing. Attribution has to be deduced from the command the
 * user sent — which is reliable because commands and Style12s travel the
 * same socket stream in order. That deduction lives here:
 *
 *   - A `follow <handle>` / `follow /b` command records the intent
 *     (including the /b flag, which the FOLLOWING confirmation cannot
 *     name — FICS replies "You will now be following strongest player's
 *     games.").
 *   - The FOLLOWING / NOT_FOLLOWING events confirm and revoke it.
 *   - An `observe <id>` / `observe /x` command parks an attribution
 *     marker for the next observed game start, so a game the user named
 *     is never stolen by a follow claim. `observe /x` gets a timeout,
 *     because a failing best-observe ("No such game.") sends no Style12
 *     to consume the marker and must not swallow the next follow game.
 *   - The first unclaimed arrival while following is the follow game:
 *     by name for a handle follow, by "any arrival" for a best follow
 *     (no name to match on).
 *
 * Closing the follow window stops following: the window is generic, so
 * the knowledge lives here, where the close event is also interpreted.
 *
 * MobX: this is the first observable store in the codebase. The machine
 * exists on the main window only (like GameManager) and is read from
 * BoardWindow popups through the shared RaptorContext, so the follow
 * label updates reactively in the already-`observer` BoardWindow.
 */

export type FollowKind =
  | { type: 'handle'; handle: string }
  | { type: 'best'; flag: string | null };

export interface GameWindowMachineDeps {
  chatService: ChatService;
  /** Send a command without echoing it to the console. The connector's
   *  hidden path, injected so the machine can stop a follow and be
   *  tested without one. */
  sendHidden: (line: string) => void;
}

/** FICS follow-best flags the Actions pane can issue and the label each
 *  renders as. Unknown flags show verbatim rather than guessing. */
const BEST_FLAG_NAMES: Readonly<Record<string, string>> = {
  '/b': 'blitz',
  '/l': 'lightning',
  '/s': 'standard',
};

/** How long an `observe /x` (no specific game) stays credible. FICS
 *  answers a failing best-observe with plain text, so no Style12 ever
 *  arrives to consume the marker; without an expiry it would swallow the
 *  next follow game that opened. */
const OBSERVE_FLAG_TIMEOUT_MS = 5000;

/** What FICS reports as the followed subject for every best-flag follow:
 *  "You will now be following strongest player's games." */
const BEST_SOURCE = 'strongest';

export class GameWindowMachine {
  /** The follow subscription in force, or null. Set optimistically from
   *  the command the user sent (so the /b flag is known), confirmed by
   *  the FOLLOWING event, cleared by NOT_FOLLOWING / bare `follow`. */
  followKind: FollowKind | null = null;
  /** The game currently claimed as the follow game, or null while the
   *  subscription waits for the next one. */
  currentFollowGame: string | null = null;
  /** Attribution marker for the user's last observe. One slot: a newer
   *  observe replaces an older one, and any successful claim or expiry
   *  consumes it. */
  private pendingObs: { gameId?: string; flag?: string; expiresAt?: number } | null =
    null;

  constructor(private readonly deps: GameWindowMachineDeps) {
    makeObservable(this, {
      followKind: observable,
      currentFollowGame: observable,
      following: computed,
      onUserCommand: action,
      classifyObservedGame: action,
      onFollowGameEnd: action,
      onFollowWindowClosed: action,
    });
    this.deps.chatService.addListener({
      id: 'game-window-machine',
      accepts: e =>
        e.type === ChatEventType.FOLLOWING || e.type === ChatEventType.NOT_FOLLOWING,
      handle: e => this.onFollowEvent(e),
    });
  }

  /** Whether a follow subscription is currently in force. */
  get following(): boolean {
    return this.followKind !== null;
  }

  dispose(): void {
    this.deps.chatService.removeListener('game-window-machine');
  }

  // ---- inputs ------------------------------------------------------------

  /** A command the user sent. Fired from the connector's onCommand hook,
   *  so it sees both typed and button commands in wire order. */
  onUserCommand(line: string): void {
    const t = line.trim().replace(/\s+/g, ' ');
    if (t.toLowerCase() === 'follow') {
      // FICS's own off switch — "Without parameters, follow will end
      // your current follow situation."
      this.followKind = null;
      this.currentFollowGame = null;
      this.pendingObs = null;
      return;
    }
    const follow = /^follow\s+(\S+)$/i.exec(t);
    if (follow) {
      const arg = follow[1];
      this.followKind = BEST_FLAG_NAMES[arg]
        ? { type: 'best', flag: arg }
        : { type: 'handle', handle: arg };
      this.currentFollowGame = null;
      this.pendingObs = null;
      return;
    }
    const observe = /^(?:observe|obs)\s+(\S+)$/i.exec(t);
    if (observe) {
      const arg = observe[1];
      this.pendingObs = /^\d+$/.test(arg)
        ? { gameId: arg }
        : BEST_FLAG_NAMES[arg]
          ? { flag: arg, expiresAt: Date.now() + OBSERVE_FLAG_TIMEOUT_MS }
          : null;
    }
  }

  /**
   * Classify a game that just started observing. GameManager calls this
   * before opening a window: 'follow' → the follow slot window, 'manual'
   * → a per-game window.
   *
   * `white`/`black` name the players, used to match a handle follow.
   */
  classifyObservedGame(
    gameId: string,
    white: string | null,
    black: string | null,
  ): 'follow' | 'manual' {
    const pending = this.pendingObs;
    if (pending) {
      if (pending.gameId === gameId) {
        // Exact observe: the user named this game. A follow claim must
        // never steal a game the user asked for by number.
        this.pendingObs = null;
        return 'manual';
      }
      if (pending.flag) {
        if (Date.now() <= (pending.expiresAt ?? 0)) {
          // Flag observe still credible: this arrival is its result.
          this.pendingObs = null;
          return 'manual';
        }
        // Stale best-observe — "No such game." never sent a Style12, so
        // this marker must not eat the follow game that just opened.
        this.pendingObs = null;
      }
    }
    const kind = this.followKind;
    if (kind) {
      if (kind.type === 'handle') {
        const h = kind.handle.toLowerCase();
        if (white?.toLowerCase() === h || black?.toLowerCase() === h) {
          this.currentFollowGame = gameId;
          return 'follow';
        }
      } else {
        // Best follow: FICS sends no name to match on, so any unrequested
        // arrival while following is the follow game.
        this.currentFollowGame = gameId;
        return 'follow';
      }
    }
    return 'manual';
  }

  /** The follow game ended. The subscription continues; we are awaiting
   *  the next one. */
  onFollowGameEnd(gameId: string): void {
    if (this.currentFollowGame === gameId) this.currentFollowGame = null;
  }

  /** The follow window was closed by the user. Closing it stops
   *  following — the machine owns that knowledge because the window is
   *  generic. Sends FICS's bare `follow` off-switch. */
  onFollowWindowClosed(): void {
    if (!this.followKind) return;
    this.deps.sendHidden('follow');
    this.followKind = null;
    this.currentFollowGame = null;
    this.pendingObs = null;
  }

  // ---- queries (read reactively by the observer BoardWindow) -------------

  /** The status marker for a board window, or null when the game is not
   *  the current follow game. `(follow billjr)` / `(follow best blitz)`. */
  followLabelFor(gameId: string | null): string | null {
    if (this.currentFollowGame !== gameId) return null;
    const kind = this.followKind;
    if (!kind) return null;
    if (kind.type === 'handle') return `(follow ${kind.handle})`;
    return kind.flag
      ? `(follow best ${BEST_FLAG_NAMES[kind.flag] ?? kind.flag})`
      : '(follow best)';
  }

  /** Whether this game is the one the follow window currently shows. */
  isFollowGame(gameId: string): boolean {
    return this.currentFollowGame === gameId;
  }

  // ---- internal ----------------------------------------------------------

  private onFollowEvent(e: ChatEvent): void {
    if (e.type === ChatEventType.NOT_FOLLOWING) {
      this.followKind = null;
      this.currentFollowGame = null;
      this.pendingObs = null;
      return;
    }
    // FOLLOWING. The kind is normally already known from the command the
    // user sent; the event only confirms it. When no command was seen
    // (follow typed in some form we did not parse), name the kind from
    // the event — except the best flags, which FICS reports as
    // "strongest" and cannot name a flag for.
    if (!this.followKind) {
      const source = e.source;
      this.followKind =
        source && source !== BEST_SOURCE
          ? { type: 'handle', handle: source }
          : { type: 'best', flag: null };
    }
    // A re-follow replaces the subscription: whatever the old window
    // shows is no longer "the follow game", even if it is still open.
    this.currentFollowGame = null;
    this.pendingObs = null;
  }
}

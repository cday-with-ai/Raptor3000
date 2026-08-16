import {
  ChatService,
  FicsConnector,
  FicsParser,
  GameService,
  defaultChatParsers,
  defaultChunkParsers,
  defaultGameLineParsers,
  type LoginCredentials,
} from '@raptor3000/shared';
import {
  GameManager,
  announceBlockedBoardWindows,
} from '../game/GameManager.js';
import { GameWindowMachine } from '../game/GameWindowMachine.js';
import { TellResolver } from '../game/TellResolver.js';
import { EngineManager } from '../engine/EngineManager.js';
import { getWindowManager } from './WindowManager.js';
import { loadPreferences } from '../preferences.js';
import { installAlertSounds } from '../alertSounds.js';

/**
 * The app-wide context that every window reads. On the main window we
 * construct one of these and hang it on `window.raptor`. Popup windows
 * look up `window.opener.raptor` and render against the same objects,
 * giving us cross-window MobX reactivity for free.
 *
 * The context owns:
 *   - ChatService + GameService (event buses)
 *   - FicsParser (wired to both services + full default parser chain)
 *   - FicsConnector (WebSocket + Timeseal2). Created lazily on login.
 *
 * If the main window closes, popups lose their context and should
 * gracefully show a "main window closed" message.
 */
export interface RaptorContext {
  chatService: ChatService;
  gameService: GameService;
  parser: FicsParser;
  connector: FicsConnector;
  /** Opens/closes board popups in response to GameService events. Lives
   *  only on the main window; popup windows don't get one of their own. */
  gameManager: GameManager | null;
  /** Decides which board window a game belongs to and labels the follow
   *  window. Main window only, but popups read it through the shared
   *  context (the machine itself is the observable, so the follow label
   *  re-renders where it is shown). */
  gameWindowMachine: GameWindowMachine | null;
  /** Pairs outbound tells with FICS confirmations so person tabs key
   *  on the canonical handle. Main window only; popups read it through
   *  the shared context. */
  tellResolver: TellResolver | null;
  /** Stockfish-backed analysis. Listens to lifecycle hooks; auto-analyzes
   *  observed/examined/finished games, never an in-progress play. Main
   *  window only. */
  engineManager: EngineManager | null;
  /** Monotonically-incremented "session" id — bumped when main reloads. */
  sessionId: number;
}

declare global {
  interface Window {
    raptor?: RaptorContext;
  }
}

export function createContext(): RaptorContext {
  const chatService = new ChatService();
  const gameService = new GameService();
  const parser = new FicsParser({
    chatParsers: defaultChatParsers(),
    gameLineParsers: defaultGameLineParsers(),
    chunkParsers: defaultChunkParsers(),
    gameService,
  });
  // Created after the connector, but its onCommand subscription must
  // exist before any login traffic flows.
  let gameWindowMachine: GameWindowMachine | null = null;
  const connector = new FicsConnector({
    // Read fresh each login: an Options edit applies to the next connect.
    loginScript: () => loadPreferences().loginScript.split('\n'),
    chatService,
    gameService,
    parser,
  });
  // Only the main window owns a GameManager — popups read context via
  // window.opener and should NOT double-register listeners or they'd
  // each try to open redundant windows.
  const main = isMainWindow();
  gameWindowMachine = main
    ? new GameWindowMachine({
        chatService,
        sendHidden: line => connector.sendMessageHidden(line),
      })
    : null;
  if (gameWindowMachine) {
    // Attribute follow/observe commands to the games they produce. The
    // machine sends its own stop (`follow`) through sendHidden, which
    // loops back here and is a harmless no-op on the already-idle state.
    connector.onCommand(line => gameWindowMachine.onUserCommand(line));
  }
  const tellResolver = main ? new TellResolver({ chatService }) : null;
  if (tellResolver) {
    connector.onCommand(line => tellResolver.onUserCommand(line));
  }
  const gameManager = main
    ? new GameManager(gameService, getWindowManager(), gameWindowMachine ?? undefined)
    : null;
  // A blocked board popup is otherwise indistinguishable from a broken board;
  // say so in the console tab rather than only in devtools.
  if (gameManager) announceBlockedBoardWindows(gameManager, chatService);
  const engineManager = main ? new EngineManager(gameService) : null;
  // Alert sounds live on the main window only — it holds the user's
  // gestures (autoplay) and one event must be one sound, not one per
  // open popup.
  if (main) installAlertSounds(chatService);
  return {
    chatService,
    gameService,
    parser,
    connector,
    gameManager,
    gameWindowMachine,
    tellResolver,
    engineManager,
    sessionId: Date.now(),
  };
}

function isMainWindow(): boolean {
  try {
    return !window.opener || (window.opener as Window).closed;
  } catch {
    // cross-origin — treat as main for safety
    return true;
  }
}

export function loginWithContext(
  ctx: RaptorContext,
  creds: LoginCredentials,
): void {
  ctx.connector.connect(creds);
}

/**
 * Resolve the current window's RaptorContext.
 *   - On main window: reads `window.raptor` (we set it at startup).
 *   - On a popup: walks to `window.opener` and returns its context.
 *   - Returns null if we're orphaned (main closed or popup opened standalone).
 */
export function resolveContext(): RaptorContext | null {
  if (window.raptor) return window.raptor;
  try {
    const opener = window.opener as Window | null;
    if (opener && !opener.closed && opener.raptor) {
      return opener.raptor;
    }
  } catch {
    // cross-origin — shouldn't happen in practice but guard anyway
  }
  return null;
}

/** True if we're running inside a popup opened by a main window. */
export function isPopup(): boolean {
  try {
    return !!(
      window.opener &&
      window.opener !== window &&
      !(window.opener as Window).closed
    );
  } catch {
    return false;
  }
}

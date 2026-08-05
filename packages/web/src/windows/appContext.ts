import {
  ChatService,
  FicsConnector,
  FicsParser,
  GameService,
  TabStoreRegistry,
  defaultChatParsers,
  defaultChunkParsers,
  defaultGameLineParsers,
  type LoginCredentials,
} from '@raptor3000/shared';
import {
  GameManager,
  announceBlockedBoardWindows,
} from '../game/GameManager.js';
import { EngineManager } from '../engine/EngineManager.js';
import { getWindowManager } from './WindowManager.js';

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
  /** Stockfish-backed analysis. Listens to lifecycle hooks; auto-analyzes
   *  observed/examined/finished games, never an in-progress play. Main
   *  window only. */
  engineManager: EngineManager | null;
  /** Chat tabs — main console + lazily-created channel/person/partner tabs. */
  tabs: TabStoreRegistry;
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
  const connector = new FicsConnector({
    chatService,
    gameService,
    parser,
  });
  // Only the main window owns a GameManager — popups read context via
  // window.opener and should NOT double-register listeners or they'd
  // each try to open redundant windows.
  const main = isMainWindow();
  const gameManager = main
    ? new GameManager(gameService, getWindowManager())
    : null;
  // A blocked board popup is otherwise indistinguishable from a broken board;
  // say so in the console tab rather than only in devtools.
  if (gameManager) announceBlockedBoardWindows(gameManager, chatService);
  const engineManager = main ? new EngineManager(gameService) : null;
  const tabs = new TabStoreRegistry(chatService, connector);
  return {
    chatService,
    gameService,
    parser,
    connector,
    gameManager,
    engineManager,
    tabs,
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

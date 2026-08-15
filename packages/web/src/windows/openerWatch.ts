/**
 * Popups outlive their opener, and that is the bug (Carson, 2026-08-14,
 * after an evening spent thinking FICS had dropped him):
 *
 *   "i think i am a dumbass, it was me closing the raptor3000 tab which
 *    disconnected."
 *
 * The FICS socket lives in the main window. Close that tab and the
 * session dies — but the board and chat popups are separate documents,
 * so they stay on screen with their last frame painted, looking every
 * bit alive. He only found out when a command came back "(not connected
 * — command not sent)". A dead session that looks connected is the worst
 * state the app can be in.
 *
 * Two halves, because neither is sufficient alone:
 *
 *   - The main window closes its popups on unload (WindowManager.closeAll
 *     from App.tsx). Handles the ordinary tab close, and is instant.
 *   - Each popup watches its opener and closes itself when the opener
 *     goes away. Handles what the first cannot: a crashed tab, a tab
 *     discarded by Chrome's Memory Saver, a kill -9. No unload handler
 *     runs in any of those.
 *
 * The watch only fires for a popup that has *seen* a live opener. A
 * window opened by pasting `?window=board&id=42` into a fresh tab has no
 * opener and never had one; that is the Orphaned screen's case, and it
 * keeps it.
 */

export interface OpenerState {
  /** Was a live opener ever observed by this document? */
  sawOpener: boolean;
  /** Is there a live opener right now? */
  hasOpener: boolean;
}

/**
 * The whole decision, as a function so it can be tested without windows.
 * Close only when an opener we had has gone — never on a document that
 * never had one.
 */
export function shouldSelfClose(state: OpenerState): boolean {
  return state.sawOpener && !state.hasOpener;
}

export function readOpenerState(sawOpener: boolean): OpenerState {
  let hasOpener: boolean;
  try {
    const o = window.opener as Window | null;
    hasOpener = !!o && !o.closed;
  } catch {
    // Cross-origin opener: not ours to follow, treat as absent.
    hasOpener = false;
  }
  return { sawOpener: sawOpener || hasOpener, hasOpener };
}

/** How often a popup checks whether its opener is still there. */
export const OPENER_POLL_MS = 1000;

/**
 * Install the watch in a popup. Returns a cleanup function. No-op in the
 * main window, which has no opener to watch and must not close itself.
 */
export function installOpenerWatch(
  close: () => void = () => window.close(),
  intervalMs: number = OPENER_POLL_MS,
): () => void {
  if (typeof window === 'undefined') return () => {};
  let sawOpener = false;
  const tick = () => {
    const state = readOpenerState(sawOpener);
    sawOpener = state.sawOpener;
    if (shouldSelfClose(state)) {
      clearInterval(id);
      close();
    }
  };
  // Read once immediately so a popup that is already orphaned at mount
  // doesn't linger for a whole poll interval — but that read can only
  // set sawOpener, never close, since sawOpener starts false.
  tick();
  const id = setInterval(tick, intervalMs);
  return () => clearInterval(id);
}

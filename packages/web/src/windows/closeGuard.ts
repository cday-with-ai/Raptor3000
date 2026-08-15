/**
 * What happens when you close a window (Carson, 2026-08-15).
 *
 * Board: "after closing windows getting (cdaysDog is observing game(s) 7
 * and 16) closing should unobs, unex automatically. if you try to close
 * a window while you are playing you get a confirm box and if you close
 * it you resign it."
 *
 * Chat: "if you close chat and you are playing lets do the same thing
 * prompt you then yes is resign" — and "if not playing just close
 * everything."
 *
 * So one rule, everywhere: **closing while a game of yours is live asks
 * first, and going through with it resigns. Closing anything else just
 * closes, silently.**
 *
 * The two-event shape is the whole reason this is a module rather than
 * four inline handlers:
 *
 *   - `beforeunload` can only ARM the browser's dialog. It cannot know
 *     what you answered, and it fires even when you then cancel.
 *   - `pagehide` fires only once the page is actually going away.
 *
 * Sending `resign` from `beforeunload` would therefore resign your game
 * every time you *considered* closing the tab and thought better of it.
 * The leaving action belongs on `pagehide` and nowhere else. That is a
 * one-line mistake with an unrecoverable consequence, which is why it is
 * written down here instead of being rediscovered per window.
 *
 * `pagehide` rather than `unload` because `unload` is not fired at all
 * in some browsers' back/forward cache paths and is actively deprecated;
 * `pagehide` is the supported hook and fires for a script-driven
 * `window.close()` too, which is how the main window takes its popups
 * with it.
 */

export interface CloseGuardEnv {
  /** Is a game of OURS live right now? Only this arms the dialog. */
  isPlaying: () => boolean;
  /**
   * The window is really going away. Send whatever the server needs to
   * hear — `unobserve`, `unexamine`, `resign`. Never called merely
   * because a dialog was shown.
   */
  onLeaving: () => void;
  /** Injected so the whole thing can be tested without a DOM. */
  addEventListener: (type: string, fn: (e: PageTransitionish) => void) => void;
  removeEventListener: (type: string, fn: (e: PageTransitionish) => void) => void;
}

/** The bits of the two events this cares about. */
export interface PageTransitionish {
  /** beforeunload: arming the dialog. */
  preventDefault?: () => void;
  returnValue?: unknown;
  /**
   * pagehide: true when the page is going into the back/forward cache
   * rather than being discarded. A cached page can come back, so it has
   * not left and must not resign anything.
   */
  persisted?: boolean;
}

/**
 * Wire the guard. Returns the teardown.
 *
 * `onLeaving` runs on a real departure whether or not a game is live —
 * an observed board still owes FICS an `unobserve` when you close it,
 * and that is the half Carson actually caught misbehaving. Only the
 * DIALOG is conditional on playing.
 */
export function installCloseGuard(env: CloseGuardEnv): () => void {
  const confirmIfPlaying = (e: PageTransitionish) => {
    if (!env.isPlaying()) return;
    // Browsers allow no custom text here: it is their generic
    // "Leave site?" dialog. The point is that it is armed ONLY when
    // there is a game to lose, so an idle close stays silent.
    e.preventDefault?.();
    e.returnValue = '';
  };

  const leave = (e: PageTransitionish) => {
    if (e.persisted) return; // bfcache: it may yet come back
    env.onLeaving();
  };

  env.addEventListener('beforeunload', confirmIfPlaying);
  env.addEventListener('pagehide', leave);
  return () => {
    env.removeEventListener('beforeunload', confirmIfPlaying);
    env.removeEventListener('pagehide', leave);
  };
}

/**
 * The commands a window owes FICS as it goes, in the order they must be
 * sent. Pure, so the ordering rule is testable and the windows do not
 * each re-derive it.
 *
 * `resign` goes LAST. A resignation ends the game, and FICS answers by
 * ending every relationship that depended on it; anything we still
 * wanted to say about another game has to be already said. It is also
 * the one command here that cannot be taken back, so it is the one to
 * send once we are certain the rest went out.
 */
export function partingCommands(state: {
  playing: boolean;
  observing: readonly string[];
  examining: boolean;
}): string[] {
  const out: string[] = [];
  for (const id of state.observing) out.push(`unobserve ${id}`);
  if (state.examining) out.push('unexamine');
  if (state.playing) out.push('resign');
  return out;
}

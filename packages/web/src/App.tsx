import { useEffect, useState } from 'react';
import {
  createContext,
  isPopup,
  resolveContext,
  type RaptorContext,
} from './windows/appContext.js';
import { installCloseGuard } from './windows/closeGuard.js';
import { getWindowManager } from './windows/WindowManager.js';
import { installOpenerWatch } from './windows/openerWatch.js';
import { MainWindow } from './windows/MainWindow.js';
import { ChatWindow } from './windows/ChatWindow.js';
import { BoardWindow } from './windows/BoardWindow.js';

/**
 * Entry router. Decaf-style multi-window: a single React bundle is loaded
 * by every window (main + popups); this component picks which "frame" to
 * render based on URL query params and opener presence.
 *
 *   No params, no opener  → MainWindow, create context, hang on window.raptor
 *   ?window=board&id=NN   → BoardWindow, context from window.opener.raptor
 *   ?window=seek          → SeekWindow
 *   Orphaned popup        → "Main window closed" reconnect screen
 */
export function App() {
  const params = new URLSearchParams(window.location.search);
  const kind = params.get('window');
  const id = params.get('id');
  // Slot windows ('follow', 'playing') carry their stable slot name so
  // the popup can key position persistence on the slot, not the game.
  const slot = params.get('slot');

  // Main window: we own the context, mount it on window.raptor. The hooks for
  // that live in MainWindowRoot rather than here, so they are never called
  // behind this `if` -- Rules of Hooks require every hook to run on every
  // render of a given component, and App renders popups without them.
  if (!kind) {
    return <MainWindowRoot />;
  }

  // Popup: resolve context from opener. If orphaned, show the lost-main screen.
  const ctx = resolveContext();
  if (!ctx) {
    return <Orphaned kind={kind} inPopup={isPopup()} />;
  }

  return <PopupRoot kind={kind} id={id} slot={slot} ctx={ctx} />;
}

/**
 * A popup's root. Exists so the opener watch can be a hook without App
 * calling hooks conditionally — App renders the main window and the
 * Orphaned screen down other branches.
 */
function PopupRoot({
  kind,
  id,
  slot,
  ctx,
}: {
  kind: string;
  id: string | null;
  slot: string | null;
  ctx: RaptorContext;
}) {
  // Close ourselves when the window that owns the FICS session goes
  // away. Covers what the opener's own unload handler cannot: a crashed
  // or discarded tab, where no handler runs there at all.
  useEffect(() => installOpenerWatch(), []);

  switch (kind) {
    case 'chat':
      return <ChatWindow context={ctx} />;
    case 'board':
      return <BoardWindow context={ctx} gameId={id} slot={slot} />;
    default:
      return <UnknownWindow kind={kind} />;
  }
}

/**
 * The main window's root: owns the RaptorContext and mounts it on
 * window.raptor. A component of its own so its hooks run unconditionally --
 * App only reaches here when this is the main window, and never renders it for
 * a popup, so the hooks below can never be skipped on a later render.
 */
function MainWindowRoot() {
  const [ctx] = useState<RaptorContext>(() => {
    // StrictMode runs this initializer twice. Reusing window.raptor makes
    // both runs return the SAME context — otherwise the tree keeps one
    // context while window.raptor (what popups resolve) points at its twin,
    // and the chat window renders an empty console forever while the real
    // one scrolls unseen. That was the post-React-19 "connected but silent"
    // bug of 2026-08-12; it also stops the twin's FicsConnector from ever
    // existing, so one page load can never race itself for the account.
    const c = window.raptor ?? createContext();
    window.raptor = c;
    return c;
  });
  // Clean up on unload so reloading the page doesn't leak stale context —
  // and log out first, best-effort: `quit` + close frees the account on
  // FICS immediately instead of leaving a ghost session it would otherwise
  // have to kick on our next login.
  useEffect(() => {
    const onUnload = () => {
      // Resign FIRST, while there is still a socket to say it on
      // (Carson, 2026-08-15: "if you close it you resign it"). The
      // disconnect below is what makes the order load-bearing rather
      // than tidy — a resign sent after it goes nowhere, silently, and
      // the game sits on FICS forfeiting on time instead.
      try {
        if (window.raptor?.gameService.isPlayingAny()) {
          window.raptor.connector.sendMessageHidden('resign');
        }
      } catch {
        // nothing better to do from a dying page
      }
      // Take the popups with us. The FICS session dies with this window
      // either way, so leaving boards and chat on screen only leaves
      // something that LOOKS connected — the state Carson spent an
      // evening misreading as a server-side drop (2026-08-14: "i think i
      // am a dumbass, it was me closing the raptor3000 tab which
      // disconnected"). His ruling when in doubt: "just kill it all …
      // i mean its dead anyway". Popups also watch us from their side
      // (openerWatch), which is what covers a crash or a discarded tab,
      // where no handler here runs at all.
      try {
        getWindowManager().closeAll();
      } catch {
        // a popup already gone or refusing to close; carry on
      }
      try {
        window.raptor?.connector.disconnect();
      } catch {
        // socket already gone; the page is going away regardless
      }
      delete window.raptor;
    };
    // One guard for both halves, because they are the same decision:
    // the dialog asks (only while a game is live — Carson's "if not
    // playing just close everything"), and the teardown runs only once
    // the page is really going. Hung off beforeunload, as it used to be,
    // cancelling the dialog left you on a page whose connection had
    // already been dismantled.
    return installCloseGuard({
      isPlaying: () => window.raptor?.gameService.isPlayingAny() ?? false,
      onLeaving: onUnload,
      addEventListener: (t, fn) => window.addEventListener(t, fn as EventListener),
      removeEventListener: (t, fn) =>
        window.removeEventListener(t, fn as EventListener),
    });
  }, []);

  return <MainWindow context={ctx} />;
}

function Orphaned({ kind, inPopup }: { kind: string; inPopup: boolean }) {
  return (
    <div style={centered}>
      <div style={{ maxWidth: 360, textAlign: 'center', lineHeight: 1.5 }}>
        <h2 style={{ marginBottom: 8 }}>Main window closed</h2>
        <p style={{ opacity: 0.7 }}>
          This {kind} window was opened from the Raptor3000 main window,
          which is no longer open.
        </p>
        {inPopup ? (
          <p style={{ opacity: 0.7 }}>
            You can close this window — open a fresh main window from the
            app URL to continue.
          </p>
        ) : (
          <p style={{ opacity: 0.7 }}>
            Visit <a href="/" style={{ color: 'var(--accent)' }}>the app root</a> to
            start a new session.
          </p>
        )}
      </div>
    </div>
  );
}

function UnknownWindow({ kind }: { kind: string }) {
  return (
    <div style={centered}>
      Unknown window kind: <code>{kind}</code>
    </div>
  );
}

const centered = {
  width: '100vw',
  height: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--bg)',
  color: 'var(--fg)',
  fontFamily: 'system-ui, sans-serif',
} as const;

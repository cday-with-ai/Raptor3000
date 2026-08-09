import { useEffect, useState } from 'react';
import {
  createContext,
  isPopup,
  resolveContext,
  type RaptorContext,
} from './windows/appContext.js';
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

  // Main window: we own the context, mount it on window.raptor.
  if (!kind) {
    const [ctx] = useState<RaptorContext>(() => {
      const c = createContext();
      window.raptor = c;
      return c;
    });
    // Clean up on unload so reloading the page doesn't leak stale context.
    useEffect(() => {
      const onUnload = () => {
        delete window.raptor;
      };
      window.addEventListener('beforeunload', onUnload);
      return () => window.removeEventListener('beforeunload', onUnload);
    }, []);
    return <MainWindow context={ctx} />;
  }

  // Popup: resolve context from opener. If orphaned, show the lost-main screen.
  const ctx = resolveContext();
  if (!ctx) {
    return <Orphaned kind={kind} inPopup={isPopup()} />;
  }

  switch (kind) {
    case 'chat':
      return <ChatWindow context={ctx} />;
    case 'board':
      return <BoardWindow context={ctx} gameId={id} />;
    default:
      return <UnknownWindow kind={kind} />;
  }
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

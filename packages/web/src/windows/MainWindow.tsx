import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import type { RaptorContext } from './appContext.js';
import { loginWithContext } from './appContext.js';
import { getWindowManager } from './WindowManager.js';
import { LoginScreen, type LoginSubmission } from './LoginScreen.js';
import { SeekGraphTab } from './SeekGraphTab.js';
import {
  pageShell,
  pageHeader,
  footer,
  helpContainer,
  optionsGrid,
} from './shellStyles.js';
import { loadProfile, loadSelection, saveSelection } from '../loginProfiles.js';
import { CHAT_COLOR_AUTO, type ChatColorKey } from '../chatFormat.js';
import {
  applyTheme,
  loadThemeMode,
  saveThemeMode,
  type ThemeMode,
} from '../theme.js';
import {
  boardColors,
  CLOCK_AUTO,
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
  type AppPreferences,
  type BoardTheme,
  type ClockState,
  type PieceSet,
  type SoundMode,
} from '../preferences.js';

/**
 * Launcher window — minimal anchor that owns the RaptorContext and spawns
 * the real functional windows (chat, seek, preferences).
 *
 * Before showing the launcher we gate on the FICS login screen (port of
 * Raptor's IcsLoginDialog). Board windows are NOT opened from here —
 * they pop in response to GameService events when games start.
 *
 * Auto-login: if the stored profile has auto-connect enabled and the
 * creds look complete, we skip the login screen on page load.
 */
export const MainWindow = observer(function MainWindow({
  context,
}: {
  context: RaptorContext;
}) {
  const wm = useMemo(() => getWindowManager(), []);
  const [session, setSession] = useState<LoginSubmission | null>(
    () => hydrateAutoLogin(),
  );

  // On login: connect the FicsConnector with the submitted creds, then
  // auto-open the chat window. Browsers treat `window.open` called
  // synchronously out of a click (or setTimeout 0) as user-gesture.
  useEffect(() => {
    if (!session) return;
    loginWithContext(context, connectorCreds(session));
    if (wm.isOpen({ kind: 'chat' })) return;
    const t = setTimeout(() => wm.open({ kind: 'chat' }), 0);
    return () => clearTimeout(t);
  }, [wm, session, context]);

  // Board-window lifecycle is owned by context.gameManager (the main
  // window's dedicated GameManager instance), which registers its own
  // GameServiceListener. No per-mount wiring needed here.

  if (!session) {
    return <LoginScreen onLogin={setSession} />;
  }

  return (
    <PostLoginShell
      context={context}
      session={session}
      sessionId={context.sessionId}
      reopenChat={() => wm.open({ kind: 'chat' })}
      reconnect={() => loginWithContext(context, connectorCreds(session))}
    />
  );
});

/** Map a login-screen submission to the connector's credential shape. */
function connectorCreds(session: LoginSubmission) {
  return {
    handle: session.creds.userName,
    password: session.creds.password,
    isGuest: session.creds.isNamedGuest || session.creds.isAnonGuest,
  };
}

type NavTab = 'options' | 'seek' | 'help';

/**
 * Post-login shell. `/` is not a window launcher — it's a settings +
 * help surface. Top nav switches between Options (preferences) and Help
 * (docs including how to install the chromeless `--app` shortcut).
 */
function PostLoginShell({
  context,
  session,
  sessionId,
  reopenChat,
  reconnect,
}: {
  context: RaptorContext;
  session: LoginSubmission;
  sessionId: number;
  reopenChat: () => void;
  reconnect: () => void;
}) {
  const [tab, setTab] = useState<NavTab>('options');
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadThemeMode());
  // A board popup the browser refused (see announceBlockedBoardWindows).
  // On a fresh production origin every first observe lands here, so the
  // fix has to be one click away, not buried in a console line.
  const [popupBlocked, setPopupBlocked] = useState(false);
  useEffect(() => {
    const onBlocked = () => setPopupBlocked(true);
    window.addEventListener('raptor:popup-blocked', onBlocked);
    return () => window.removeEventListener('raptor:popup-blocked', onBlocked);
  }, []);

  // Apply here as well as persist: a `storage` event does not fire in the
  // window that wrote the value, so the sync installed in `main.tsx` — which
  // is what carries the change to the popups — cannot see our own edit. It
  // owns the OS-flip watch for this document, so there is no watcher here.
  useEffect(() => {
    applyTheme(themeMode);
    saveThemeMode(themeMode);
  }, [themeMode]);

  const who = session.creds.isAnonGuest
    ? 'anonymous guest'
    : session.creds.isNamedGuest
      ? `${session.creds.userName} (guest)`
      : session.creds.userName;

  return (
    <div style={pageShell}>
      <header style={pageHeader}>
        <div style={headerRow}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/raptor3000.svg" alt="" style={{ width: 40, height: 40 }} />
            <div>
              <div style={brand}>Raptor3000</div>
              <div style={tagline}>
              Signed in as <strong>{who}</strong> · {session.creds.serverUrl}:
                {session.creds.port} · profile {session.profile}
              </div>
            </div>
          </div>
          <nav style={navRow}>
            <NavButton active={tab === 'options'} onClick={() => setTab('options')}>
              Options
            </NavButton>
            <NavButton active={tab === 'seek'} onClick={() => setTab('seek')}>
              Seek
            </NavButton>
            <NavButton active={tab === 'help'} onClick={() => setTab('help')}>
              Help
            </NavButton>
            <ThemeToggle mode={themeMode} onChange={setThemeMode} />
          </nav>
        </div>
      </header>

      {popupBlocked && (
        <div style={blockedBanner}>
          <span>
            <strong>Your browser blocked a board window.</strong> A game
            opened on FICS but its board couldn't appear — allow popups
            for this site and re-observe.
          </span>
          <span style={{ flexShrink: 0, display: 'inline-flex', gap: 8 }}>
            <button
              style={bannerAction}
              onClick={() => {
                setTab('help');
                setPopupBlocked(false);
              }}
            >
              Show me how
            </button>
            <button
              style={bannerDismiss}
              title="dismiss"
              onClick={() => setPopupBlocked(false)}
            >
              ×
            </button>
          </span>
        </div>
      )}

      {tab === 'options' && <OptionsPage reopenChat={reopenChat} reconnect={reconnect} />}
      {tab === 'seek' && <SeekGraphTab context={context} />}
      {tab === 'help' && <HelpPage />}

      <footer style={footer}>
        session #{sessionId.toString(16).slice(-6)}
      </footer>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px',
        background: active ? 'var(--bg-input)' : 'transparent',
        color: 'var(--fg)',
        border: '1px solid var(--border)',
        borderBottom: active
          ? '2px solid var(--accent)'
          : '1px solid var(--border)',
        borderRadius: 3,
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </button>
  );
}

function ThemeToggle({
  mode,
  onChange,
}: {
  mode: ThemeMode;
  onChange: (m: ThemeMode) => void;
}) {
  const next: Record<ThemeMode, ThemeMode> = {
    light: 'dark',
    dark: 'system',
    system: 'light',
  };
  const label: Record<ThemeMode, string> = {
    light: '\u2600\uFE0F Day',
    dark: '\u{1F319} Night',
    system: '\u{1F4BB} System',
  };
  return (
    <button
      aria-label={`Theme: ${mode}. Click to switch.`}
      onClick={() => onChange(next[mode])}
      style={{
        marginLeft: 10,
        padding: '6px 12px',
        background: 'var(--bg-raised)',
        color: 'var(--fg)',
        border: '1px solid var(--border)',
        borderRadius: 3,
        cursor: 'pointer',
        fontSize: 13,
      }}
    >
      {label[mode]}
    </button>
  );
}

function OptionsPage({
  reopenChat,
  reconnect,
}: {
  reopenChat: () => void;
  reconnect: () => void;
}) {
  const [prefs, setPrefs] = useState<AppPreferences>(() => loadPreferences());
  // Two-step reset: first click arms it, second click resets. Avoids a
  // blocking confirm() dialog and still can't fire by accident.
  const [resetArmed, setResetArmed] = useState(false);

  function update<K extends keyof AppPreferences>(k: K, v: AppPreferences[K]) {
    setPrefs(p => {
      const next = { ...p, [k]: v };
      savePreferences(next);
      return next;
    });
  }

  function resetToDefaults() {
    if (!resetArmed) {
      setResetArmed(true);
      return;
    }
    savePreferences(DEFAULT_PREFERENCES);
    setPrefs(DEFAULT_PREFERENCES);
    setResetArmed(false);
  }

  return (
    <main style={optionsGrid}>
        <Section title="Session">
          <Row label="Chat window">
            <button style={linkBtn} onClick={reopenChat}>
              Reopen
            </button>
            <Note>The chat window auto-opens at login; reopen here if closed.</Note>
          </Row>
          <Row label="Connection">
            <button style={linkBtn} onClick={reconnect}>
              Reconnect
            </button>
            <Note>
              No-op while connected. Use it after another login kicks this
              session — it takes the account back (FICS kicks them in turn).
            </Note>
          </Row>
          <AutoLoginRow />
        </Section>

        <Section title="Board">
          <Row label="Colors">
            <Select<BoardTheme>
              value={prefs.boardTheme}
              onChange={v => update('boardTheme', v)}
              options={[
                ['brown', 'Brown'],
                ['blue', 'Blue'],
                ['green', 'Green'],
                ['purple', 'Purple'],
                ['ic', 'IC'],
                ['horsey', 'Horsey'],
                ['custom', 'Custom'],
              ]}
            />
            <BoardPreview prefs={prefs} />
          </Row>
          {prefs.boardTheme === 'custom' && (
            <>
              <Row label="Light squares">
                <ColorField
                  title="Light squares"
                  value={prefs.customLightSquareColor}
                  onChange={hex => update('customLightSquareColor', hex)}
                />
              </Row>
              <Row label="Dark squares">
                <ColorField
                  title="Dark squares"
                  value={prefs.customDarkSquareColor}
                  onChange={hex => update('customDarkSquareColor', hex)}
                />
              </Row>
            </>
          )}
          <Row label="Piece set">
            <Select<PieceSet>
              value={prefs.pieceSet}
              onChange={v => update('pieceSet', v)}
              options={[
                ['alpha', 'Alpha'],
                ['cardinal', 'Cardinal'],
                ['cburnett', 'Cburnett'],
                ['leipzig', 'Leipzig'],
                ['mpchess', 'MPChess'],
              ]}
            />
          </Row>
          <Row label="Move animations">
            <Toggle
              checked={prefs.boardAnimations}
              onChange={v => update('boardAnimations', v)}
            />
          </Row>
          <Row label="Show coordinates">
            <Toggle
              checked={prefs.boardCoordinates}
              onChange={v => update('boardCoordinates', v)}
            />
          </Row>
          <Row label="Flip when playing as black">
            <Toggle
              checked={prefs.flipOnPlayAsBlack}
              onChange={v => update('flipOnPlayAsBlack', v)}
            />
          </Row>
          <Row label="Move list visible">
            <Toggle
              checked={prefs.moveListVisible}
              onChange={v => update('moveListVisible', v)}
            />
          </Row>
        </Section>

        <Section title="Clock colors">
          <ClockColorRow label="Active" state="active" prefs={prefs} update={update} />
          <ClockColorRow label="Low on time" state="low" prefs={prefs} update={update} />
          <ClockColorRow label="Idle" state="idle" prefs={prefs} update={update} />
          <Note>
            Auto follows the app theme (idle) and the stock green/red chips
            (active, low). Pick colors to override — background, then text.
          </Note>
        </Section>

        <Section title="Console">
          <Row label="Font">
            <input
              style={{ ...textInput, width: 190 }}
              value={prefs.chatFontFamily}
              onChange={e => update('chatFontFamily', e.target.value)}
              spellCheck={false}
              title="CSS font-family for the chat window"
            />
            <input
              type="number"
              min={8}
              max={24}
              style={{ ...textInput, width: 52, marginLeft: 6 }}
              value={prefs.chatFontSize}
              onChange={e => {
                const v = parseInt(e.target.value, 10);
                if (Number.isInteger(v) && v >= 8 && v <= 24) update('chatFontSize', v);
              }}
              title="Font size (px)"
            />
          </Row>
          <ChatColorRow label="Channel tells" prefKey="chatColorChannel" autoKey="channel" prefs={prefs} update={update} />
          <ChatColorRow label="Tells" prefKey="chatColorTell" autoKey="tell" prefs={prefs} update={update} />
          <ChatColorRow label="Shouts" prefKey="chatColorShout" autoKey="shout" prefs={prefs} update={update} />
          <ChatColorRow label="Kibitz / whisper" prefKey="chatColorGame" autoKey="game" prefs={prefs} update={update} />
          <ChatColorRow label="Internal" prefKey="chatColorInternal" autoKey="internal" prefs={prefs} update={update} />
          <ChatColorRow label="Your sends" prefKey="chatColorOutbound" autoKey="outbound" prefs={prefs} update={update} />
          <Note>
            Colors per message type; Auto is the stock palette. Open chat
            windows restyle live.
          </Note>
        </Section>

        <Section title="Defaults">
          <Row label="All options">
            <button
              style={{
                ...linkBtn,
                ...(resetArmed
                  ? { borderColor: '#a04040', color: '#d86868', fontWeight: 600 }
                  : {}),
              }}
              onClick={resetToDefaults}
              onMouseLeave={() => setResetArmed(false)}
            >
              {resetArmed ? 'Click again to confirm' : 'Reset to defaults'}
            </button>
            <Note>
              Restores every option above — board colors, pieces, clock
              colors, toggles — to the shipped defaults. Login profiles are
              not touched.
            </Note>
          </Row>
        </Section>

        <Section title="Engine">
          <Row label="Stockfish analysis available">
            <Toggle
              checked={prefs.showEngineAnalysis}
              onChange={v => update('showEngineAnalysis', v)}
            />
            <Note>Only in observing, examining, and inactive modes — never while playing.</Note>
          </Row>
        </Section>

        <Section title="Sound">
          <Row label="Sounds">
            <Select<SoundMode>
              value={prefs.soundMode}
              onChange={v => update('soundMode', v)}
              options={[
                ['on', 'On'],
                ['off', 'Off'],
              ]}
            />
          </Row>
        </Section>

        <Section title="Channels">
          <Row label="Auto-join on login">
            <input
              style={textInput}
              value={prefs.autoJoinChannels}
              onChange={e => update('autoJoinChannels', e.target.value)}
              placeholder="e.g. 1,4,53"
            />
            <Note>Comma-separated channel numbers.</Note>
          </Row>
          <Row label="History backfill">
            <input
              style={textInput}
              value={prefs.channelHistoryUrl}
              onChange={e => update('channelHistoryUrl', e.target.value)}
              placeholder="https://… (empty = off)"
              spellCheck={false}
            />
            <Note>
              Channel-log API (the chessascent bot). On chat-window open,
              each auto-join channel is backfilled with up to 24h of tells
              from before login — scroll up to read them. Empty disables.
            </Note>
          </Row>
        </Section>
      </main>
  );
}

function HelpPage() {
  return (
    <main style={helpContainer}>
      <Section title="What is this page?">
        <p style={helpP}>
          This is the <strong>Options &amp; Help</strong> surface. It's not a
          launcher — the chat window auto-opens when you sign in, and board
          windows pop up automatically when you observe or play a game. Use
          the <em>Options</em> tab to change app preferences.
        </p>
      </Section>

      <Section title="Allow popups (required)">
        <p style={helpP}>
          Boards open when FICS says a game started — from a network
          event, not from your click — which is exactly what popup
          blockers block. Until this origin is allowed, observing a game
          logs a console line instead of opening a board. One-time fix:
        </p>
        <ul style={helpUl}>
          <li>
            <strong>Chrome / Brave / Edge</strong> — click the popup icon
            at the right end of the address bar when it appears and pick{' '}
            <em>Always allow pop-ups from this site</em>. Or: Settings →
            Privacy → Site settings → Pop-ups and redirects → Add this
            site to "Allowed".
          </li>
          <li>
            <strong>Firefox</strong> — a yellow bar appears when a popup
            is blocked; choose <em>Preferences</em> →{' '}
            <em>Allow pop-ups for this site</em>. Or: Settings → Privacy
            &amp; Security → Permissions → Block pop-up windows →
            Exceptions.
          </li>
          <li>
            <strong>Safari</strong> — Safari → Settings → Websites →
            Pop-up Windows → set this site to <em>Allow</em>.
          </li>
        </ul>
        <p style={helpP}>
          In <code style={code}>--app</code> mode (next section) popups
          from the app window inherit the allowance once the origin is
          allowed.
        </p>
      </Section>

      <Section title="Hide the browser address bar (app mode)">
        <p style={helpP}>
          Modern browsers require an address bar on regular tabs and popups for
          security. But Chromium-based browsers (Chrome, Brave, Edge) support an{' '}
          <code style={code}>--app=&lt;url&gt;</code> launch flag that opens a
          given URL in a chromeless window — no URL bar, no tab strip, no menu.
          Create a shortcut that passes the flag and pin it to your
          taskbar/dock.
        </p>
        <p style={helpP}>
          The commands below are baked with{' '}
          <code style={code}>{appOrigin()}</code> — the address you're
          reading this from — so they're copy-paste correct wherever the
          app is served.
        </p>

        <h4 style={subHeading}>Linux (GNOME / Pop!_OS / KDE)</h4>
        <ol style={helpOl}>
          <li>
            Create <code style={code}>~/.local/share/applications/raptor3000.desktop</code>{' '}
            with this content:
            <pre style={pre}>{DESKTOP_FILE_CONTENTS}</pre>
          </li>
          <li>
            Refresh the app menu:{' '}
            <code style={code}>
              update-desktop-database ~/.local/share/applications/
            </code>
          </li>
          <li>
            Open Activities / app menu, search "Raptor3000", right-click → Pin
            to Dash or drag to your taskbar.
          </li>
        </ol>
        <p style={helpP}>
          Substitute <code style={code}>brave-browser</code> with{' '}
          <code style={code}>google-chrome</code> or{' '}
          <code style={code}>microsoft-edge</code> if you use those instead.
        </p>

        <h4 style={subHeading}>Windows</h4>
        <ol style={helpOl}>
          <li>Right-click your desktop → New → Shortcut.</li>
          <li>
            For the location, paste (adjust the path if your browser lives
            elsewhere):
            <pre style={pre}>{WINDOWS_TARGET_BRAVE}</pre>
            For Chrome instead:
            <pre style={pre}>{WINDOWS_TARGET_CHROME}</pre>
          </li>
          <li>Name it "Raptor3000", click Finish.</li>
          <li>Right-click the new shortcut → Pin to taskbar.</li>
        </ol>
        <p style={helpP}>
          (Optional) Right-click the shortcut → Properties → Change Icon, point
          at a <code style={code}>.ico</code> so it doesn't look like Brave.
        </p>

        <h4 style={subHeading}>macOS</h4>
        <p style={helpP}>
          macOS doesn't accept raw CLI flags on Dock shortcuts, so wrap the
          launch in a tiny <strong>Automator</strong> app:
        </p>
        <ol style={helpOl}>
          <li>
            Open <strong>Automator</strong> → New Document → <strong>Application</strong>.
          </li>
          <li>
            Add a <em>Run Shell Script</em> action. Paste (adjust the browser
            path if needed):
            <pre style={pre}>{MACOS_SHELL_BRAVE}</pre>
            For Chrome:
            <pre style={pre}>{MACOS_SHELL_CHROME}</pre>
          </li>
          <li>
            Save as <code style={code}>Raptor3000.app</code> into{' '}
            <code style={code}>/Applications</code>.
          </li>
          <li>
            Drag <code style={code}>Raptor3000.app</code> into the Dock.
          </li>
        </ol>
        <p style={helpP}>
          (Optional) Right-click <code style={code}>Raptor3000.app</code> in
          Finder → Get Info → drag a custom icon onto the icon well for a
          distinct Dock look.
        </p>
      </Section>

      <Section title="About &amp; licenses">
        <p style={helpP}>
          Raptor3000 is <strong>MIT-licensed</strong>, by Carson Day —
          the third of a line after <strong>Raptor</strong> (SWT) and{' '}
          <strong>Decaf</strong> (Java). It stands on generously licensed
          shoulders:
        </p>
        <ul style={helpUl}>
          <li>
            <strong>
              <a href="https://stockfishchess.org/" target="_blank" rel="noreferrer" style={helpLink}>
                Stockfish
              </a>
            </strong>{' '}
            — the analysis engine, running in your browser as WebAssembly
            (GPL-3.0).
          </li>
          <li>
            <strong>
              <a href="https://github.com/niklasf/chessops" target="_blank" rel="noreferrer" style={helpLink}>
                chessops
              </a>
            </strong>{' '}
            — lichess's chess library: SAN, legality, replay
            (GPL-3.0-or-later).
          </li>
          <li>
            <strong>
              <a href="https://github.com/lichess-org/chess-openings" target="_blank" rel="noreferrer" style={helpLink}>
                lichess chess-openings
              </a>
            </strong>{' '}
            — the opening names and ECO codes (CC0 public domain).
          </li>
          <li>
            <strong>
              <a href="https://github.com/lichess-org/lila" target="_blank" rel="noreferrer" style={helpLink}>
                lichess
              </a>
            </strong>{' '}
            — the piano sound set by Enigmahack (AGPL-3.0+) and the piece
            sets (cburnett by Colin M.L. Burnett and friends, each under
            its own license).
          </li>
          <li>
            <strong>
              <a href="https://www.freechess.org/" target="_blank" rel="noreferrer" style={helpLink}>
                FICS
              </a>
            </strong>{' '}
            — the Free Internet Chess Server this whole app exists to
            talk to. Be nice in channel 39.
          </li>
        </ul>
        <p style={helpP}>
          The complete inventory with exact licenses lives in{' '}
          <code style={code}>THIRD_PARTY_NOTICES.md</code> in the source
          repository.
        </p>
      </Section>

      <Section title="Troubleshooting">
        <ul style={helpUl}>
          <li>
            <strong>Address bar still shows.</strong> Modern browsers show a
            one-line origin strip at the top of popups regardless of features.
            The <code style={code}>--app</code> mode above avoids it entirely
            for the main window. Popups opened from inside an app-mode window
            inherit the same chromeless treatment.
          </li>
          <li>
            <strong>Popup blocker.</strong> Allow popups for{' '}
            <code style={code}>localhost:5173</code> (or your prod host). In
            Brave: Settings → Privacy and security → Site settings → Pop-ups.
          </li>
          <li>
            <strong>Shortcut opens a regular tab, not an app window.</strong>{' '}
            Make sure the flag is <code style={code}>--app=URL</code> with an{' '}
            <code style={code}>=</code> and no space, and the browser isn't
            already running with a profile that overrides it.
          </li>
        </ul>
      </Section>
    </main>
  );
}

const blockedBanner = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  margin: '10px 24px 0',
  padding: '8px 12px',
  borderRadius: 6,
  border: '1px solid var(--border-soft)',
  background: 'rgba(255, 180, 0, 0.14)',
  fontSize: 13,
  lineHeight: 1.4,
} as const;

const bannerAction = {
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  padding: '3px 10px',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
} as const;

const bannerDismiss = {
  background: 'transparent',
  color: 'var(--fg-dim)',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  padding: '0 4px',
} as const;

const helpLink = {
  color: 'var(--accent)',
  textDecoration: 'none',
} as const;

/** The origin the app is actually served from — localhost in dev, the
 *  production host once deployed. Keeps the Help scripts always-true. */
function appOrigin(): string {
  return typeof window !== 'undefined' ? `${window.location.origin}/` : 'http://localhost:5173/';
}

const DESKTOP_FILE_CONTENTS =
  `[Desktop Entry]
Type=Application
Name=Raptor3000
Exec=brave-browser --app=${appOrigin()}
Icon=brave-browser
Terminal=false
Categories=Network;Game;
StartupWMClass=Raptor3000
`;

const WINDOWS_TARGET_BRAVE =
  `"C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe" --app=${appOrigin()}`;

const WINDOWS_TARGET_CHROME =
  `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --app=${appOrigin()}`;

const MACOS_SHELL_BRAVE =
  `/Applications/Brave\\ Browser.app/Contents/MacOS/Brave\\ Browser --app=${appOrigin()}`;

const MACOS_SHELL_CHROME =
  `/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --app=${appOrigin()}`;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={sectionStyle}>
      <h3 style={sectionTitle}>{title}</h3>
      <div style={sectionBody}>{children}</div>
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={rowStyle}>
      <span style={rowLabel}>{label}</span>
      <div style={rowControl}>{children}</div>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <div style={noteStyle}>{children}</div>;
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      <span style={{ fontSize: 13, opacity: 0.9 }}>{checked ? 'On' : 'Off'}</span>
    </label>
  );
}

function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly (readonly [T, string])[];
}) {
  return (
    <select
      style={selectStyle}
      value={value}
      onChange={e => onChange(e.target.value as T)}
    >
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}

/** Four-square strip showing the current colors and piece set together. */
function BoardPreview({ prefs }: { prefs: AppPreferences }) {
  const { light, dark } = boardColors(prefs);
  const cell = 22;
  return (
    <div
      style={{
        display: 'inline-flex',
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid var(--border-soft)',
        marginLeft: 10,
        verticalAlign: 'middle',
      }}
    >
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{ width: cell, height: cell, background: i % 2 === 0 ? light : dark }}>
          {i === 1 && (
            <img src={`/pieces/${prefs.pieceSet}/wN.svg`} alt="" width={cell} height={cell} draggable={false} />
          )}
          {i === 2 && (
            <img src={`/pieces/${prefs.pieceSet}/bQ.svg`} alt="" width={cell} height={cell} draggable={false} />
          )}
        </div>
      ))}
    </div>
  );
}

const colorInput = {
  width: 44,
  height: 26,
  padding: 0,
  border: '1px solid var(--border-strong)',
  borderRadius: 4,
  background: 'var(--bg-input)',
  cursor: 'pointer',
} as const;

/**
 * A color control that works even where the native color dialog doesn't
 * (Brave/Wayland notoriously fails to open it): the swatch is a normal
 * <input type=color> for browsers where it works AND a live preview, and
 * the hex field beside it always works — type a #rrggbb and press enter.
 */
function ColorField({
  value,
  onChange,
  title,
}: {
  value: string;
  onChange: (hex: string) => void;
  title: string;
}) {
  const [text, setText] = useState(value);
  // Follow external changes (Auto toggles, storage sync).
  useEffect(() => setText(value), [value]);
  const commit = () => {
    const v = text.trim();
    if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) onChange(v);
    else setText(value); // revert bad input
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <input
        type="color"
        title={title}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={colorInput}
      />
      <input
        type="text"
        title={`${title} (hex)`}
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit();
        }}
        spellCheck={false}
        style={hexInput}
      />
    </span>
  );
}

const hexInput = {
  width: 72,
  padding: '3px 6px',
  fontFamily: '"SF Mono", Consolas, monospace',
  fontSize: 12,
  background: 'var(--bg-input)',
  color: 'var(--fg)',
  border: '1px solid var(--border-strong)',
  borderRadius: 4,
} as const;

/**
 * One clock state's color controls: an Auto checkbox and, when custom,
 * background + text pickers. Turning Auto off seeds the pickers with what
 * auto currently resolves to — for the idle chip that means reading the
 * live theme variables, so the starting point is what's on screen.
 */
function ClockColorRow({
  label,
  state,
  prefs,
  update,
}: {
  label: string;
  state: ClockState;
  prefs: AppPreferences;
  update: <K extends keyof AppPreferences>(k: K, v: AppPreferences[K]) => void;
}) {
  const bgKey = `clock${capState(state)}Bg` as const;
  const textKey = `clock${capState(state)}Text` as const;
  const bg = prefs[bgKey];
  const text = prefs[textKey];
  const isAuto = bg === 'auto' && text === 'auto';

  const toggleAuto = (auto: boolean) => {
    if (auto) {
      update(bgKey, 'auto');
      update(textKey, 'auto');
    } else {
      update(bgKey, stockHex(state, 'bg'));
      update(textKey, stockHex(state, 'text'));
    }
  };

  return (
    <Row label={label}>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={isAuto}
          onChange={e => toggleAuto(e.target.checked)}
        />
        Auto
      </label>
      {!isAuto && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 10 }}>
          <ColorField
            title="Background"
            value={bg === 'auto' ? stockHex(state, 'bg') : bg}
            onChange={hex => update(bgKey, hex)}
          />
          <ColorField
            title="Text"
            value={text === 'auto' ? stockHex(state, 'text') : text}
            onChange={hex => update(textKey, hex)}
          />
        </span>
      )}
    </Row>
  );
}

/**
 * Auto-login toggle — the escape from the trap where auto-login is only
 * settable on the login screen, which auto-login itself skips forever.
 */
function AutoLoginRow() {
  const [autoConnect, setAutoConnect] = useState(() => loadSelection().autoConnect);
  return (
    <Row label="Auto-login">
      <Toggle
        checked={autoConnect}
        onChange={v => {
          const sel = loadSelection();
          saveSelection({ ...sel, autoConnect: v });
          setAutoConnect(v);
        }}
      />
      <Note>
        Off shows the login screen on the next launch instead of connecting
        with the saved profile.
      </Note>
    </Row>
  );
}

/** One chat event type's color: Auto checkbox + picker when custom. */
function ChatColorRow({
  label,
  prefKey,
  autoKey,
  prefs,
  update,
}: {
  label: string;
  prefKey: keyof AppPreferences;
  autoKey: ChatColorKey;
  prefs: AppPreferences;
  update: <K extends keyof AppPreferences>(k: K, v: AppPreferences[K]) => void;
}) {
  const value = prefs[prefKey] as string;
  const isAuto = value === 'auto';
  const stock = () => {
    const raw = CHAT_COLOR_AUTO[autoKey];
    if (raw.startsWith('#')) return raw;
    const resolved = getComputedStyle(document.documentElement)
      .getPropertyValue(raw.startsWith('var(') ? raw.slice(4, -1) : '--fg')
      .trim();
    return /^#/.test(resolved) ? resolved : '#808080';
  };
  return (
    <Row label={label}>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={isAuto}
          onChange={e =>
            update(prefKey, (e.target.checked ? 'auto' : stock()) as AppPreferences[typeof prefKey])
          }
        />
        Auto
      </label>
      {!isAuto && (
        <span style={{ marginLeft: 10, display: 'inline-flex' }}>
          <ColorField title={label} value={value} onChange={hex => update(prefKey, hex as AppPreferences[typeof prefKey])} />
        </span>
      )}
    </Row>
  );
}

function capState(s: ClockState): 'Active' | 'Low' | 'Idle' {
  return (s[0].toUpperCase() + s.slice(1)) as 'Active' | 'Low' | 'Idle';
}

/** What 'auto' resolves to, as a hex a color input can hold. The idle
 *  chip's auto look is CSS variables — read them from the live theme. */
function stockHex(state: ClockState, channel: 'bg' | 'text'): string {
  const raw = CLOCK_AUTO[state][channel];
  if (raw.startsWith('#')) return raw;
  const cs = getComputedStyle(document.documentElement);
  const resolved =
    raw === 'inherit'
      ? cs.getPropertyValue('--fg')
      : cs.getPropertyValue(raw.slice('var('.length, -1));
  const hex = resolved.trim();
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex) ? hex : '#808080';
}

function hydrateAutoLogin(): LoginSubmission | null {
  const sel = loadSelection();
  if (!sel.autoConnect) return null;
  const creds = loadProfile(sel.activeProfile);
  const isGuest = creds.isNamedGuest || creds.isAnonGuest;
  const handleOk = /^[a-zA-Z]*$/.test(creds.userName) &&
    (creds.userName === '' ||
      (creds.userName.length >= 3 && creds.userName.length <= 17));
  const ready = handleOk &&
    (isGuest || (creds.userName !== '' && creds.password !== ''));
  if (!ready) return null;
  return { profile: sel.activeProfile, creds, autoConnect: sel.autoConnect };
}

const brand = {
  fontSize: 22,
  fontWeight: 700,
  letterSpacing: 1,
} as const;

const tagline = { opacity: 0.7, fontSize: 13, marginTop: 4 } as const;

const headerRow = {
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'wrap' as const,
} as const;

const navRow = {
  display: 'flex',
  gap: 6,
} as const;

const helpP = {
  margin: '0 0 10px 0',
  fontSize: 13,
  lineHeight: 1.6,
  opacity: 0.9,
} as const;

const helpOl = {
  margin: '0 0 10px 20px',
  padding: 0,
  fontSize: 13,
  lineHeight: 1.8,
} as const;

const helpUl = {
  margin: '0 0 10px 20px',
  padding: 0,
  fontSize: 13,
  lineHeight: 1.8,
} as const;

const subHeading = {
  margin: '14px 0 6px 0',
  fontSize: 13,
  fontWeight: 600,
  opacity: 0.95,
} as const;

const code = {
  fontFamily: '"SF Mono", Consolas, monospace',
  fontSize: 12,
  background: 'var(--bg-sunken)',
  padding: '1px 5px',
  borderRadius: 3,
  border: '1px solid var(--border)',
} as const;

const pre = {
  fontFamily: '"SF Mono", Consolas, monospace',
  fontSize: 12,
  background: 'var(--bg-sunken)',
  padding: 10,
  borderRadius: 4,
  border: '1px solid var(--border)',
  overflow: 'auto' as const,
  margin: '6px 0 10px',
  whiteSpace: 'pre-wrap' as const,
  wordBreak: 'break-all' as const,
} as const;

const sectionStyle = {
  background: 'var(--bg-raised)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: 16,
} as const;

const sectionTitle = {
  margin: '0 0 12px 0',
  fontSize: 13,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.8,
  opacity: 0.7,
  fontWeight: 600,
} as const;

const sectionBody = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 10,
} as const;

const rowStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 4,
} as const;

const rowLabel = {
  fontSize: 13,
  opacity: 0.85,
} as const;

const rowControl = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap' as const,
} as const;

const noteStyle = {
  fontSize: 11,
  opacity: 0.5,
  flexBasis: '100%',
} as const;

const textInput = {
  flex: 1,
  minWidth: 160,
  padding: '6px 8px',
  background: 'var(--bg-input)',
  color: 'var(--fg)',
  border: '1px solid var(--border)',
  borderRadius: 3,
  fontSize: 13,
  fontFamily: 'inherit',
} as const;

const selectStyle = {
  padding: '5px 8px',
  background: 'var(--bg-input)',
  color: 'var(--fg)',
  border: '1px solid var(--border)',
  borderRadius: 3,
  fontSize: 13,
} as const;

const linkBtn = {
  padding: '4px 10px',
  background: 'var(--accent-soft)',
  color: 'var(--fg)',
  border: '1px solid var(--accent)',
  borderRadius: 3,
  cursor: 'pointer',
  fontSize: 12,
} as const;


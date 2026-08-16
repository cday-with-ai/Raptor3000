import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import type { RaptorContext } from './appContext.js';
import { loginWithContext } from './appContext.js';
import { getWindowManager } from './WindowManager.js';
import { LoginScreen, type LoginSubmission } from './LoginScreen.js';
import {
  pageShell,
  pageHeader,
  footer,
  helpContainer,
  optionsGrid,
} from './shellStyles.js';
import { loadProfile, loadSelection, saveSelection } from '../loginProfiles.js';
import { LanguageSelect, useT } from '../i18n/react.js';
import type { MessageKey } from '../i18n/index.js';
import { armRelaunchToLogin, consumeRelaunchToLogin } from '../relaunch.js';
import { playSound } from '../sounds.js';
import { playAlert } from '../alertSounds.js';
import { chooseJournalFile, loadJournalHandle, supportsSavePicker } from './pgnJournal.js';
import { useLivePreferences } from '../useLivePreferences.js';
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
      relaunch={() => {
        // Full restart at the login screen: the reload is the teardown
        // (nothing half-alive to leak); closing the popups first keeps
        // them from waking up orphaned, and the armed flag makes the
        // next launch stop at login even with auto-login on.
        armRelaunchToLogin();
        wm.closeAll();
        context.connector.disconnect();
        location.reload();
      }}
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

// Seek left this nav on 2026-08-15 — it is a chat-window layout now
// (Carson: "next to (plain, tabs, split)"), which is where you are when
// you go looking for a game.
/**
 * How often the keep-alive ticks. It was 59 minutes against FICS's
 * 60-minute idle limit — a one-minute margin, in a timer that lives in
 * the MAIN window, which sits backgrounded while play happens in the
 * popups. Chrome throttles timers in backgrounded tabs (minute-aligned
 * under intensive throttling), so the tick could land late and lose a
 * race it should never have been running. 20 minutes has the same effect
 * on FICS and three chances to land before the limit.
 */
export const KEEP_ALIVE_MS = 20 * 60 * 1000;

type NavTab = 'options' | 'help';

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
  relaunch,
}: {
  context: RaptorContext;
  session: LoginSubmission;
  sessionId: number;
  reopenChat: () => void;
  reconnect: () => void;
  relaunch: () => void;
}) {
  const [tab, setTab] = useState<NavTab>('options');
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadThemeMode());
  const { t, rich } = useT();
  // A board popup the browser refused (see announceBlockedBoardWindows).
  // On a fresh production origin every first observe lands here, so the
  // fix has to be one click away, not buried in a console line.
  const [popupBlocked, setPopupBlocked] = useState(false);
  // Keep-alive (Carson: "date every 59 min or something"): FICS drops
  // idle sessions; a hidden periodic command holds this one. The
  // command is a preference; sendMessageHidden no-ops when offline.
  const shellPrefs = useLivePreferences();
  useEffect(() => {
    if (shellPrefs.keepAlive !== 'on') return undefined;
    const t = setInterval(() => {
      context.connector.sendMessageHidden(shellPrefs.keepAliveCommand.trim() || 'date');
    }, KEEP_ALIVE_MS);
    return () => clearInterval(t);
  }, [shellPrefs.keepAlive, shellPrefs.keepAliveCommand, context]);
  useEffect(() => {
    const onBlocked = () => setPopupBlocked(true);
    window.addEventListener('raptor:popup-blocked', onBlocked);
    return () => window.removeEventListener('raptor:popup-blocked', onBlocked);
  }, []);
  // Dead link → the Relaunch panel (Carson, 2026-08-14: "just a relaunch
  // button… no label above it, the verbiage below it" — explicitly NOT a
  // reopen-chat / reconnect flow). Starts false so the initial handshake
  // doesn't flash it; the connector's first event decides from then on.
  const [linkDown, setLinkDown] = useState(false);
  useEffect(
    () => context.connector.onConnectionChange(up => setLinkDown(!up)),
    [context],
  );

  // Apply here as well as persist: a `storage` event does not fire in the
  // window that wrote the value, so the sync installed in `main.tsx` — which
  // is what carries the change to the popups — cannot see our own edit. It
  // owns the OS-flip watch for this document, so there is no watcher here.
  useEffect(() => {
    applyTheme(themeMode);
    saveThemeMode(themeMode);
  }, [themeMode]);

  const who = session.creds.isAnonGuest
    ? t('shell.who.anonGuest')
    : session.creds.isNamedGuest
      ? t('shell.who.namedGuest', { name: session.creds.userName })
      : session.creds.userName;

  return (
    <div style={pageShell}>
      <header style={pageHeader}>
        <div style={headerRow}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/raptor3000.png" alt="" style={{ width: 40, height: 40 }} />
            <div>
              <div style={brand}>Raptor3000</div>
              <div style={tagline}>
                {rich('shell.signedIn', {
                  who,
                  server: session.creds.serverUrl,
                  port: session.creds.port,
                  profile: session.profile,
                })}
              </div>
            </div>
          </div>
          <nav style={navRow}>
            <NavButton active={tab === 'options'} onClick={() => setTab('options')}>
              {t('shell.nav.options')}
            </NavButton>
            <NavButton active={tab === 'help'} onClick={() => setTab('help')}>
              {t('shell.nav.help')}
            </NavButton>
            <ThemeToggle mode={themeMode} onChange={setThemeMode} />
          </nav>
        </div>
      </header>

      {popupBlocked && (
        <div style={blockedBanner}>
          <span>{rich('shell.blocked.text')}</span>
          <span style={{ flexShrink: 0, display: 'inline-flex', gap: 8 }}>
            <button
              style={bannerAction}
              onClick={() => {
                setTab('help');
                setPopupBlocked(false);
              }}
            >
              {t('shell.blocked.showMe')}
            </button>
            <button
              style={bannerDismiss}
              title={t('shell.blocked.dismiss')}
              onClick={() => setPopupBlocked(false)}
            >
              ×
            </button>
          </span>
        </div>
      )}

      {linkDown && (
        <div style={disconnectPanel}>
          {/* One click, no arming — unlike the Options relaunch, there is
              no live session left to lose. */}
          <button style={disconnectRelaunch} onClick={relaunch}>
            {t('shell.disconnect.relaunch')}
          </button>
          <div style={disconnectVerbiage}>{t('shell.disconnect.body')}</div>
        </div>
      )}

      {tab === 'options' && <OptionsPage reopenChat={reopenChat} reconnect={reconnect} relaunch={relaunch} />}
      {tab === 'help' && <HelpPage />}

      <footer style={{ ...footer, display: 'flex', justifyContent: 'space-between' }}>
        <span>{t('shell.footer.session', { id: sessionId.toString(16).slice(-6) })}</span>
        <span>
          <a href={`${REPO_URL}/issues/new?labels=enhancement&title=Suggestion%3A%20`} target="_blank" rel="noreferrer" style={footerLink}>
            {t('shell.footer.suggest')}
          </a>
          {' · '}
          <a href={`${REPO_URL}/issues/new?labels=bug&title=Bug%3A%20`} target="_blank" rel="noreferrer" style={footerLink}>
            {t('shell.footer.report')}
          </a>
        </span>
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
  const { t } = useT();
  const next: Record<ThemeMode, ThemeMode> = {
    light: 'dark',
    dark: 'system',
    system: 'light',
  };
  const icon: Record<ThemeMode, string> = {
    light: '\u2600\uFE0F',
    dark: '\u{1F319}',
    system: '\u{1F4BB}',
  };
  const name: Record<ThemeMode, MessageKey> = {
    light: 'shell.theme.light',
    dark: 'shell.theme.dark',
    system: 'shell.theme.system',
  };
  const label: Record<ThemeMode, string> = {
    light: `${icon.light} ${t(name.light)}`,
    dark: `${icon.dark} ${t(name.dark)}`,
    system: `${icon.system} ${t(name.system)}`,
  };
  return (
    <button
      aria-label={t('shell.theme.aria', { mode: t(name[mode]) })}
      onClick={() => onChange(next[mode])}
      style={{
        marginInlineStart: 10,
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
  relaunch,
}: {
  reopenChat: () => void;
  reconnect: () => void;
  relaunch: () => void;
}) {
  const [prefs, setPrefs] = useState<AppPreferences>(() => loadPreferences());
  // Two-step reset: first click arms it, second click resets. Avoids a
  // blocking confirm() dialog and still can't fire by accident.
  const [resetArmed, setResetArmed] = useState(false);
  // Same two-step for relaunch: it drops the connection and every window,
  // which mid-game is a real cost.
  const [relaunchArmed, setRelaunchArmed] = useState(false);
  const { t } = useT();

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
        <Section title={t('options.session')}>
          <Row label={t('options.session.chatWindow')}>
            <button style={linkBtn} onClick={reopenChat}>
              {t('options.session.reopen')}
            </button>
            <Note>{t('options.session.chatNote')}</Note>
          </Row>
          <Row label={t('options.session.connection')}>
            <button style={linkBtn} onClick={reconnect}>
              {t('options.session.reconnect')}
            </button>
            <Note>{t('options.session.connectionNote')}</Note>
          </Row>
          <Row label={t('options.session.startOver')}>
            <button
              style={{
                ...linkBtn,
                ...(relaunchArmed
                  ? { borderColor: '#a04040', color: '#d86868', fontWeight: 600 }
                  : {}),
              }}
              onClick={() => {
                if (!relaunchArmed) {
                  setRelaunchArmed(true);
                  return;
                }
                relaunch();
              }}
              onMouseLeave={() => setRelaunchArmed(false)}
            >
              {t(relaunchArmed ? 'options.session.relaunchArmed' : 'options.session.relaunch')}
            </button>
            <Note>{t('options.session.relaunchNote')}</Note>
          </Row>
          <AutoLoginRow />
          <Row label={t('lang.label')}>
            <LanguageSelect style={selectStyle} />
            <Note>{t('lang.note')}</Note>
          </Row>
        </Section>

        <Section title={t('options.board')}>
          <Row label={t('options.board.colors')}>
            <Select<BoardTheme>
              value={prefs.boardTheme}
              onChange={v => update('boardTheme', v)}
              options={[
                ['brown', t('boardTheme.brown')],
                ['blue', t('boardTheme.blue')],
                ['green', t('boardTheme.green')],
                ['purple', t('boardTheme.purple')],
                // Names, not colors — lichess's, and the same everywhere.
                ['ic', 'IC'],
                ['horsey', 'Horsey'],
                ['custom', t('boardTheme.custom')],
              ]}
            />
            <BoardPreview prefs={prefs} />
          </Row>
          {prefs.boardTheme === 'custom' && (
            <>
              <Row label={t('options.board.lightSquares')}>
                <ColorField
                  title={t('options.board.lightSquares')}
                  value={prefs.customLightSquareColor}
                  onChange={hex => update('customLightSquareColor', hex)}
                />
              </Row>
              <Row label={t('options.board.darkSquares')}>
                <ColorField
                  title={t('options.board.darkSquares')}
                  value={prefs.customDarkSquareColor}
                  onChange={hex => update('customDarkSquareColor', hex)}
                />
              </Row>
            </>
          )}
          <Row label={t('options.board.pieceSet')}>
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
          <Row label={t('options.board.animations')}>
            <Toggle
              checked={prefs.boardAnimations}
              onChange={v => update('boardAnimations', v)}
            />
          </Row>
          <Row label={t('options.board.coordinates')}>
            <Toggle
              checked={prefs.boardCoordinates}
              onChange={v => update('boardCoordinates', v)}
            />
          </Row>
          <Row label={t('options.board.flipAsBlack')}>
            <Toggle
              checked={prefs.flipOnPlayAsBlack}
              onChange={v => update('flipOnPlayAsBlack', v)}
            />
          </Row>
          <Row label={t('options.board.moveList')}>
            <Toggle
              checked={prefs.moveListVisible}
              onChange={v => update('moveListVisible', v)}
            />
          </Row>
        </Section>

        <Section title={t('options.clock')}>
          <ClockColorRow labelKey="options.clock.active" state="active" prefs={prefs} update={update} />
          <ClockColorRow labelKey="options.clock.low" state="low" prefs={prefs} update={update} />
          <ClockColorRow labelKey="options.clock.idle" state="idle" prefs={prefs} update={update} />
          <Note>{t('options.clock.note')}</Note>
        </Section>

        <Section title={t('options.console')}>
          <Row label={t('options.console.font')}>
            <input
              style={{ ...textInput, width: 190 }}
              value={prefs.chatFontFamily}
              onChange={e => update('chatFontFamily', e.target.value)}
              spellCheck={false}
              title={t('options.console.fontFamilyTitle')}
            />
            <input
              type="number"
              min={8}
              max={24}
              style={{ ...textInput, width: 52, marginInlineStart: 6 }}
              value={prefs.chatFontSize}
              onChange={e => {
                const v = parseInt(e.target.value, 10);
                if (Number.isInteger(v) && v >= 8 && v <= 24) update('chatFontSize', v);
              }}
              title={t('options.console.fontSizeTitle')}
            />
          </Row>
          <ChatColorRow labelKey="options.console.channelTells" prefKey="chatColorChannel" autoKey="channel" prefs={prefs} update={update} />
          <ChatColorRow labelKey="options.console.tells" prefKey="chatColorTell" autoKey="tell" prefs={prefs} update={update} />
          <ChatColorRow labelKey="options.console.shouts" prefKey="chatColorShout" autoKey="shout" prefs={prefs} update={update} />
          <ChatColorRow labelKey="options.console.kibitz" prefKey="chatColorGame" autoKey="game" prefs={prefs} update={update} />
          <ChatColorRow labelKey="options.console.challenges" prefKey="chatColorChallenge" autoKey="challenge" prefs={prefs} update={update} />
          <ChatColorRow labelKey="options.console.gameStarts" prefKey="chatColorGameStart" autoKey="gameStart" prefs={prefs} update={update} />
          <ChatColorRow labelKey="options.console.gameEnds" prefKey="chatColorGameEnd" autoKey="gameEnd" prefs={prefs} update={update} />
          <ChatColorRow labelKey="options.console.internal" prefKey="chatColorInternal" autoKey="internal" prefs={prefs} update={update} />
          <ChatColorRow labelKey="options.console.outbound" prefKey="chatColorOutbound" autoKey="outbound" prefs={prefs} update={update} />
          <Note>{t('options.console.note')}</Note>
        </Section>

        <Section title={t('options.defaults')}>
          <Row label={t('options.defaults.all')}>
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
              {t(resetArmed ? 'options.defaults.resetArmed' : 'options.defaults.reset')}
            </button>
            <Note>{t('options.defaults.note')}</Note>
          </Row>
        </Section>

        <Section title={t('options.engine')}>
          <Row label={t('options.engine.available')}>
            <Toggle
              checked={prefs.showEngineAnalysis}
              onChange={v => update('showEngineAnalysis', v)}
            />
            <Note>{t('options.engine.note')}</Note>
          </Row>
        </Section>

        <Section title={t('options.pgnJournal')}>
          <Row label={t('options.pgnJournal.append')}>
            <Toggle
              checked={prefs.autoAppendPgn}
              onChange={v => update('autoAppendPgn', v)}
            />
            <Note>{t('options.pgnJournal.appendNote')}</Note>
          </Row>
          <Row label={t('options.pgnJournal.file')}>
            <JournalFileRow active={prefs.autoAppendPgn} />
          </Row>
        </Section>

        <Section title={t('options.sound')}>
          <Row label={t('options.sound.sounds')}>
            <Select<SoundMode>
              value={prefs.soundMode}
              onChange={v => update('soundMode', v)}
              options={[
                ['on', t('common.on')],
                ['off', t('common.off')],
              ]}
            />
          </Row>
          <Row label={t('options.sound.keepAlive')}>
            <Toggle
              checked={prefs.keepAlive === 'on'}
              onChange={v => update('keepAlive', v ? 'on' : 'off')}
            />
            <input
              style={{ ...textInput, width: 120, marginInlineStart: 8 }}
              value={prefs.keepAliveCommand}
              onChange={e => update('keepAliveCommand', e.target.value)}
              spellCheck={false}
              title={t('options.sound.keepAliveTitle')}
            />
          </Row>
          <Row label={t('options.sound.moveSounds')}>
            <select
              style={textInput}
              value={prefs.moveSoundSet}
              onChange={e => update('moveSoundSet', e.target.value as AppPreferences['moveSoundSet'])}
            >
              <option value="sfx">Sfx</option>
              <option value="piano">Piano</option>
              <option value="futuristic">Futuristic</option>
              <option value="nes">Nes (8-bit)</option>
            </select>
            <button
              style={{ ...linkBtn, marginInlineStart: 8 }}
              title={t('options.sound.movePreviewTitle')}
              onClick={() => {
                playSound('move');
                setTimeout(() => playSound('capture'), 700);
                setTimeout(() => playSound('check'), 1400);
              }}
            >
              {t('common.preview')}
            </button>
          </Row>
          <Row label={t('options.sound.alerts')}>
            <Select<SoundMode>
              value={prefs.alertSounds}
              onChange={v => update('alertSounds', v)}
              options={[
                ['on', t('common.on')],
                ['off', t('common.off')],
              ]}
            />
            <button
              style={{ ...linkBtn, marginInlineStart: 8 }}
              title={t('options.sound.alertPreviewTitle')}
              onClick={() => {
                playAlert('tell');
                setTimeout(() => playAlert('arrive'), 900);
                setTimeout(() => playAlert('depart'), 1800);
              }}
            >
              {t('common.preview')}
            </button>
          </Row>
          <Note>{t('options.sound.note')}</Note>
        </Section>

        <Section title={t('options.loginScript')}>
          <textarea
            style={{ ...textInput, width: '100%', minHeight: 210, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }}
            value={prefs.loginScript}
            onChange={e => update('loginScript', e.target.value)}
            spellCheck={false}
          />
          <Note>
            {t('options.loginScript.note1')}{' '}
            <code style={code}>iset lock 1</code>{' '}
            {t('options.loginScript.note2')}
          </Note>
        </Section>

        <Section title={t('options.channels')}>
          <Row label={t('options.channels.autoJoin')}>
            <input
              style={textInput}
              value={prefs.autoJoinChannels}
              onChange={e => update('autoJoinChannels', e.target.value)}
              placeholder="e.g. 1,4,53"
            />
            <Note>{t('options.channels.autoJoinNote')}</Note>
          </Row>
          <Row label={t('options.channels.backfill')}>
            <input
              style={textInput}
              value={prefs.channelHistoryUrl}
              onChange={e => update('channelHistoryUrl', e.target.value)}
              placeholder="https://… (empty = off)"
              spellCheck={false}
            />
            <Note>{t('options.channels.backfillNote')}</Note>
          </Row>
        </Section>
      </main>
  );
}

function HelpPage() {
  const { t, rich } = useT();
  return (
    <main style={helpContainer}>
      <Section title={t('help.what.title')}>
        <p style={helpP}>{rich('help.what.body1')}</p>
      </Section>

      <Section title={t('help.popups.title')}>
        <p style={helpP}>{t('help.popups.intro')}</p>
        <ul style={helpUl}>
          <li>
            <strong>Chrome / Brave / Edge</strong> — {t('help.popups.chromium')}
          </li>
          <li>
            <strong>Firefox</strong> — {t('help.popups.firefox')}
          </li>
          <li>
            <strong>Safari</strong> — {t('help.popups.safari')}
          </li>
        </ul>
        <p style={helpP}>
          {t('help.popups.appmode1')} <code style={code}>--app</code>{' '}
          {t('help.popups.appmode2')}
        </p>
      </Section>

      <Section title={t('help.commands.title')}>
        <p style={helpP}>{t('help.commands.intro')}</p>
        <ul style={helpUl}>
          <li>
            <code style={code}>clear censor</code> /{' '}
            <code style={code}>clear noplay</code> — {t('help.commands.clear1')}{' '}
            <code style={code}>-censor</code> /{' '}
            <code style={code}>-noplay</code> {t('help.commands.clear2')}
          </li>
          <li>
            <code style={code}>+tab 39</code> — {t('help.commands.tab1')}{' '}
            <code style={code}>+tab HammerTime</code> —{' '}
            {t('help.commands.tab2')}
          </li>
        </ul>
        <p style={helpP}>
          {t('help.commands.rest1')}{' '}
          <a
            href="https://www.freechess.org/Help/AllFiles.html"
            target="_blank"
            rel="noreferrer"
            style={helpLink}
          >
            {t('help.commands.refLink')}
          </a>{' '}
          {t('help.commands.rest2')}
        </p>
      </Section>

      <Section title={t('help.appmode.title')}>
        <p style={helpP}>
          {t('help.appmode.intro1')}{' '}
          <code style={code}>--app=&lt;url&gt;</code>{' '}
          {t('help.appmode.intro2')}
        </p>
        <p style={helpP}>
          {t('help.appmode.baked1')} <code style={code}>{appOrigin()}</code>{' '}
          {t('help.appmode.baked2')}
        </p>

        <h4 style={subHeading}>{t('help.appmode.linux')}</h4>
        <ol style={helpOl}>
          <li>
            {t('help.appmode.linux1')}{' '}
            <code style={code}>~/.local/share/applications/raptor3000.desktop</code>{' '}
            {t('help.appmode.linux1b')}
            <pre style={pre}>{DESKTOP_FILE_CONTENTS}</pre>
          </li>
          <li>
            {t('help.appmode.linux2')}{' '}
            <code style={code}>
              update-desktop-database ~/.local/share/applications/
            </code>
          </li>
          <li>{t('help.appmode.linux3')}</li>
        </ol>
        <p style={helpP}>
          {t('help.appmode.linuxSub1')}{' '}
          <code style={code}>brave-browser</code> {t('help.appmode.linuxSub2')}{' '}
          <code style={code}>google-chrome</code> {t('help.appmode.linuxSub3')}{' '}
          <code style={code}>microsoft-edge</code> {t('help.appmode.linuxSub4')}
        </p>

        <h4 style={subHeading}>{t('help.appmode.windows')}</h4>
        <ol style={helpOl}>
          <li>{t('help.appmode.windows1')}</li>
          <li>
            {t('help.appmode.windows2')}
            <pre style={pre}>{WINDOWS_TARGET_BRAVE}</pre>
            {t('help.appmode.windows2b')}
            <pre style={pre}>{WINDOWS_TARGET_CHROME}</pre>
          </li>
          <li>{t('help.appmode.windows3')}</li>
          <li>{t('help.appmode.windows4')}</li>
        </ol>
        <p style={helpP}>
          {t('help.appmode.windowsIcon1')} <code style={code}>.ico</code>{' '}
          {t('help.appmode.windowsIcon2')}
        </p>

        <h4 style={subHeading}>{t('help.appmode.macos')}</h4>
        <p style={helpP}>
          {t('help.appmode.macosIntro1')} <strong>Automator</strong>{' '}
          {t('help.appmode.macosIntro2')}
        </p>
        <ol style={helpOl}>
          <li>
            {t('help.appmode.macos1a')} <strong>Automator</strong>{' '}
            {t('help.appmode.macos1b')} <strong>Application</strong>.
          </li>
          <li>
            {t('help.appmode.macos2a')} <em>Run Shell Script</em>{' '}
            {t('help.appmode.macos2b')}
            <pre style={pre}>{MACOS_SHELL_BRAVE}</pre>
            {t('help.appmode.macos2c')}
            <pre style={pre}>{MACOS_SHELL_CHROME}</pre>
          </li>
          <li>
            {t('help.appmode.macos3a')}{' '}
            <code style={code}>Raptor3000.app</code>{' '}
            {t('help.appmode.macos3b')}{' '}
            <code style={code}>/Applications</code>.
          </li>
          <li>
            {t('help.appmode.macos4a')}{' '}
            <code style={code}>Raptor3000.app</code>{' '}
            {t('help.appmode.macos4b')}
          </li>
        </ol>
        <p style={helpP}>
          {t('help.appmode.macosIcon1')}{' '}
          <code style={code}>Raptor3000.app</code>{' '}
          {t('help.appmode.macosIcon2')}
        </p>
      </Section>

      <Section title={t('help.about.title')}>
        <p style={helpP}>{rich('help.about.intro')}</p>
        <ul style={helpUl}>
          <li>
            <strong>
              <a href="https://stockfishchess.org/" target="_blank" rel="noreferrer" style={helpLink}>
                Stockfish
              </a>
            </strong>{' '}
            {t('help.about.stockfish')}
          </li>
          <li>
            <strong>
              <a href="https://github.com/niklasf/chessops" target="_blank" rel="noreferrer" style={helpLink}>
                chessops
              </a>
            </strong>{' '}
            {t('help.about.chessops')}
          </li>
          <li>
            <strong>
              <a href="https://github.com/lichess-org/chess-openings" target="_blank" rel="noreferrer" style={helpLink}>
                lichess chess-openings
              </a>
            </strong>{' '}
            {t('help.about.openings')}
          </li>
          <li>
            <strong>
              <a href="https://github.com/lichess-org/lila" target="_blank" rel="noreferrer" style={helpLink}>
                lichess
              </a>
            </strong>{' '}
            {t('help.about.lichess')}
          </li>
          <li>
            <strong>
              <a href="https://www.freechess.org/" target="_blank" rel="noreferrer" style={helpLink}>
                FICS
              </a>
            </strong>{' '}
            {t('help.about.fics')}
          </li>
        </ul>
        <p style={helpP}>
          {t('help.about.outro1')}{' '}
          <code style={code}>THIRD_PARTY_NOTICES.md</code>{' '}
          {t('help.about.outro2')}{' '}
          <a href={REPO_URL} target="_blank" rel="noreferrer" style={helpLink}>
            {t('help.about.repoLink')}
          </a>
          {t('help.about.outro3')}{' '}
          <a href={`${REPO_URL}/issues/new?labels=bug&title=Bug%3A%20`} target="_blank" rel="noreferrer" style={helpLink}>
            {t('help.about.reportLink')}
          </a>{' '}
          {t('help.about.outro4')}{' '}
          <a href={`${REPO_URL}/issues/new?labels=enhancement&title=Suggestion%3A%20`} target="_blank" rel="noreferrer" style={helpLink}>
            {t('help.about.suggestLink')}
          </a>
          .
        </p>
      </Section>

      <Section title={t('help.trouble.title')}>
        <ul style={helpUl}>
          <li>
            <strong>{t('help.trouble.addressBarTitle')}</strong>{' '}
            {t('help.trouble.addressBar1')} <code style={code}>--app</code>{' '}
            {t('help.trouble.addressBar2')}
          </li>
          <li>
            <strong>{t('help.trouble.blockerTitle')}</strong>{' '}
            {t('help.trouble.blocker1')}{' '}
            <code style={code}>localhost:5173</code>{' '}
            {t('help.trouble.blocker2')}
          </li>
          <li>
            <strong>{t('help.trouble.shortcutTitle')}</strong>{' '}
            {t('help.trouble.shortcut1')}{' '}
            <code style={code}>--app=URL</code> {t('help.trouble.shortcut2')}{' '}
            <code style={code}>=</code> {t('help.trouble.shortcut3')}
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

// The disconnect surface: the button IS the header — nothing above it,
// the explanation below it, per Carson's 2026-08-14 spec.
const disconnectPanel = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  margin: '10px 24px 0',
  padding: '14px 16px',
  borderRadius: 6,
  border: '1px solid var(--border-strong)',
  background: 'var(--bg-raised)',
  flexShrink: 0,
} as const;

const disconnectRelaunch = {
  ...bannerAction,
  padding: '10px 32px',
  fontSize: 15,
} as const;

const disconnectVerbiage = {
  color: 'var(--fg-muted)',
  fontSize: 13,
  lineHeight: 1.5,
  textAlign: 'center',
  maxWidth: 520,
} as const;

const bannerDismiss = {
  background: 'transparent',
  color: 'var(--fg-dim)',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  padding: '0 4px',
} as const;

const REPO_URL = 'https://github.com/cday-with-ai/Raptor3000';

const footerLink = {
  color: 'var(--fg-dim)',
  textDecoration: 'underline',
  textUnderlineOffset: 2,
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
  const { t } = useT();
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      <span style={{ fontSize: 13, opacity: 0.9 }}>
        {t(checked ? 'common.on' : 'common.off')}
      </span>
    </label>
  );
}

/**
 * The journal-file picker row (Options → PGN auto-save). Choosing the
 * file lives HERE and only here, because both the picker and
 * `requestPermission` need a user gesture and this button is one. The
 * chosen handle is persisted in IndexedDB; the board popup reads it at
 * game end with no gesture available. Status states, in the row:
 *   - nothing chosen yet → the button only
 *   - unsupported browser → a plain note, no button
 *   - chosen → the file's name, with a change button
 */
function JournalFileRow({ active }: { active: boolean }) {
  const { t } = useT();
  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'none' }
    | { kind: 'unsupported' }
    | { kind: 'chosen'; name: string }
  >({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    void loadJournalHandle().then(handle => {
      if (cancelled) return;
      if (!handle) {
        setState({ kind: 'none' });
        return;
      }
      setState({ kind: 'chosen', name: handle.name });
    });
    return () => {
      cancelled = true;
    };
  }, [active]);

  if (!supportsSavePicker) {
    return <Note>{t('options.pgnJournal.unsupported')}</Note>;
  }

  return (
    <>
      <button
        style={linkBtn}
        onClick={() => {
          void chooseJournalFile('my-games.pgn').then(result => {
            if (result.ok) setState({ kind: 'chosen', name: result.name });
            else if (result.reason === 'unsupported') setState({ kind: 'unsupported' });
            else if (result.reason === 'denied') setState({ kind: 'none' });
          });
        }}
      >
        {state.kind === 'chosen' ? t('options.pgnJournal.change') : t('options.pgnJournal.choose')}
      </button>
      {state.kind === 'chosen' && <span style={{ fontSize: 12, opacity: 0.8 }}>{state.name}</span>}
      <Note>
        {state.kind === 'chosen'
          ? t('options.pgnJournal.chosenNote')
          : t('options.pgnJournal.noneNote')}
      </Note>
    </>
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
        marginInlineStart: 10,
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
  labelKey,
  state,
  prefs,
  update,
}: {
  labelKey: MessageKey;
  state: ClockState;
  prefs: AppPreferences;
  update: <K extends keyof AppPreferences>(k: K, v: AppPreferences[K]) => void;
}) {
  const { t } = useT();
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
    <Row label={t(labelKey)}>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={isAuto}
          onChange={e => toggleAuto(e.target.checked)}
        />
        {t('common.auto')}
      </label>
      {!isAuto && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginInlineStart: 10 }}>
          <ColorField
            title={t('options.color.background')}
            value={bg === 'auto' ? stockHex(state, 'bg') : bg}
            onChange={hex => update(bgKey, hex)}
          />
          <ColorField
            title={t('options.color.text')}
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
  const { t } = useT();
  return (
    <Row label={t('options.session.autoLogin')}>
      <Toggle
        checked={autoConnect}
        onChange={v => {
          const sel = loadSelection();
          saveSelection({ ...sel, autoConnect: v });
          setAutoConnect(v);
        }}
      />
      <Note>{t('options.session.autoLoginNote')}</Note>
    </Row>
  );
}

/** One chat event type's color: Auto checkbox + picker when custom. */
function ChatColorRow({
  labelKey,
  prefKey,
  autoKey,
  prefs,
  update,
}: {
  labelKey: MessageKey;
  prefKey: keyof AppPreferences;
  autoKey: ChatColorKey;
  prefs: AppPreferences;
  update: <K extends keyof AppPreferences>(k: K, v: AppPreferences[K]) => void;
}) {
  const { t } = useT();
  const label = t(labelKey);
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
        {t('common.auto')}
      </label>
      {!isAuto && (
        <span style={{ marginInlineStart: 10, display: 'inline-flex' }}>
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
  // A relaunch asked for the login screen; the flag is one-shot, so the
  // launch after this one auto-logins again as configured.
  if (consumeRelaunchToLogin()) return null;
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


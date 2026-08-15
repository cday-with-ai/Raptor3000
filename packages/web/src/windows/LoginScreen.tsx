import { useEffect, useRef, useState } from 'react';
import { isMobileDemo, setMobileOverride, shouldBlockMobile } from '../mobile.js';
import { LanguageSelect, useT } from '../i18n/react.js';
import type { MessageKey } from '../i18n/index.js';
import { PopupGate } from './PopupGate.js';
import {
  PROFILE_NAMES,
  loadProfile,
  saveProfile,
  loadSelection,
  saveSelection,
  type ProfileCreds,
  type ProfileName,
} from '../loginProfiles.js';

/**
 * FICS login screen — port of Raptor's IcsLoginDialog (SWT Dialog).
 *
 * Parity with Raptor:
 *   - Profile combo (Primary/Secondary/Tertiary), independent creds each.
 *   - Handle (3-17 chars, letters only), Password (hidden), Server, Port.
 *   - Checkboxes: Guest (disables password), Timeseal enabled, Auto-login.
 *   - Enter submits from any text field.
 *   - Validation errors open a message dialog (here: inline error text).
 *   - On successful submit, profile is persisted and `onLogin()` fires.
 *
 * Deliberately out of scope for now: the "Another simultaneous
 * connection" / Simul Bug toggle — Raptor hides it by default too.
 */
export interface LoginSubmission {
  profile: ProfileName;
  creds: ProfileCreds;
  autoConnect: boolean;
}

export function LoginScreen({
  onLogin,
}: {
  onLogin: (sub: LoginSubmission) => void;
}) {
  const [profile, setProfile] = useState<ProfileName>(
    () => loadSelection().activeProfile,
  );
  const [creds, setCreds] = useState<ProfileCreds>(() => loadProfile(profile));
  const [autoConnect, setAutoConnect] = useState<boolean>(
    () => loadSelection().autoConnect,
  );
  // The key, not the sentence: a validation error showing while the
  // visitor switches language would otherwise stay frozen in the old one.
  const [error, setError] = useState<MessageKey | null>(null);
  const handleRef = useRef<HTMLInputElement>(null);
  const { t, rich } = useT();

  // Switching profile loads its creds. Save the outgoing profile so the
  // user doesn't lose in-flight edits — mirrors the Java ModifyListener.
  useEffect(() => {
    handleRef.current?.focus();
  }, []);

  function switchProfile(next: ProfileName) {
    saveProfile(profile, creds);
    setProfile(next);
    setCreds(loadProfile(next));
    setError(null);
  }

  const isGuest = creds.isNamedGuest || creds.isAnonGuest;

  function setField<K extends keyof ProfileCreds>(k: K, v: ProfileCreds[K]) {
    setCreds(c => ({ ...c, [k]: v }));
  }

  function setGuestChecked(checked: boolean) {
    setCreds(c => ({
      ...c,
      password: checked ? '' : c.password,
      isNamedGuest: checked && c.userName.trim() !== '',
      isAnonGuest: checked && c.userName.trim() === '',
    }));
  }

  function submit() {
    const handle = creds.userName.trim();
    if (handle !== '' && (handle.length < 3 || handle.length > 17)) {
      setError('login.err.handleLength');
      return;
    }
    if (handle !== '' && !/^[a-zA-Z]*$/.test(handle)) {
      setError('login.err.handleLetters');
      return;
    }
    if (!isGuest && handle === '') {
      setError('login.err.noHandle');
      return;
    }
    if (!isGuest && creds.password === '') {
      setError('login.err.noPassword');
      return;
    }

    // Re-derive named-vs-anon guest flags one last time on submit.
    const finalCreds: ProfileCreds = {
      ...creds,
      isNamedGuest: isGuest && handle !== '',
      isAnonGuest: isGuest && handle === '',
    };
    saveProfile(profile, finalCreds);
    saveSelection({ activeProfile: profile, autoConnect });
    onLogin({ profile, creds: finalCreds, autoConnect });
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  }

  const [blocked, setBlocked] = useState(() => isMobileDemo() || shouldBlockMobile());
  if (blocked) {
    return (
      <div style={{ ...shell, position: 'relative', overflow: 'auto', flexDirection: 'column', justifyContent: 'flex-start' }}>
        <StarField />
        <div style={mobileStop}>
          <img src="/raptor3000.svg" alt="" style={{ width: 88, height: 88, margin: '0 auto 10px', display: 'block' }} />
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.02em' }}>
            {t('mobile.title')}
          </div>
          <p style={{ lineHeight: 1.55, opacity: 0.9 }}>{rich('mobile.body1')}</p>
          <p style={{ lineHeight: 1.55, opacity: 0.9 }}>{rich('mobile.body2')}</p>
          <button
            style={mobileTryAnyway}
            onClick={() => {
              if (!isMobileDemo()) setMobileOverride();
              setBlocked(false);
            }}
          >
            {t('mobile.tryAnyway')}
          </button>
          <div style={{ marginTop: 16 }}>
            <LanguageSelect style={loginLangSelect} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...shell, position: 'relative', overflow: 'auto', flexDirection: 'column', justifyContent: 'flex-start' }}>
      <StarField />
      {/* Auto-tests popups on mount; renders nothing unless they're
          blocked, so it sits above everything unconditionally. */}
      <PopupGate />
      {/* margin:auto centers when there's room and top-aligns (scrollable)
          when there isn't — justify-center would clip the top instead. */}
      <div style={{ margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 12px' }}>
        <form
        style={card}
        onSubmit={e => {
          e.preventDefault();
          submit();
        }}
      >
        <img src="/raptor3000.svg" alt="" style={loginIcon} />
        <div style={brand}>Raptor3000</div>
        <div style={tagline}>{t('login.tagline')}</div>


        <label style={row}>
          <span style={label}>{t('login.profile')}</span>
          <select
            style={input}
            value={profile}
            onChange={e => switchProfile(e.target.value as ProfileName)}
          >
            {PROFILE_NAMES.map(p => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label style={row}>
          <span style={label}>{t('login.handle')}</span>
          <input
            ref={handleRef}
            style={input}
            value={creds.userName}
            onChange={e => setField('userName', e.target.value)}
            onKeyDown={onKey}
            autoComplete="username"
            spellCheck={false}
          />
        </label>

        <label style={row}>
          <span style={label}>{t('login.password')}</span>
          <input
            type="password"
            style={{
              ...input,
              opacity: isGuest ? 0.4 : 1,
            }}
            value={creds.password}
            disabled={isGuest}
            onChange={e => setField('password', e.target.value)}
            onKeyDown={onKey}
            autoComplete="current-password"
          />
        </label>

        <label style={row}>
          <span style={label}>{t('login.server')}</span>
          <input
            style={input}
            value={creds.serverUrl}
            onChange={e => setField('serverUrl', e.target.value)}
            onKeyDown={onKey}
            spellCheck={false}
          />
        </label>

        <label style={row}>
          <span style={label}>{t('login.port')}</span>
          <input
            style={input}
            value={creds.port}
            onChange={e => setField('port', e.target.value)}
            onKeyDown={onKey}
            inputMode="numeric"
          />
        </label>

        <div style={checks}>
          <label style={check}>
            <input
              type="checkbox"
              checked={isGuest}
              onChange={e => setGuestChecked(e.target.checked)}
            />
            <span>{t('login.guest')}</span>
          </label>
          <label style={check}>
            <input
              type="checkbox"
              checked={creds.timesealEnabled}
              onChange={e => setField('timesealEnabled', e.target.checked)}
            />
            <span>{t('login.timeseal')}</span>
          </label>
          <label style={check}>
            <input
              type="checkbox"
              checked={autoConnect}
              onChange={e => setAutoConnect(e.target.checked)}
            />
            <span>{t('login.autoConnect')}</span>
          </label>
          <label style={{ ...check, cursor: 'default' }}>
            <span style={{ ...label, width: 'auto' }}>{t('lang.label')}</span>
            <LanguageSelect style={loginLangSelect} />
          </label>
        </div>

        {error && <div style={errStyle}>{t(error)}</div>}

        <button type="submit" style={submitBtn}>
          {t('login.submit')}
        </button>
        </form>
        {/* What's inside — shots refresh via scripts/screenshots.mjs. */}
        <div style={galleryRow}>
          {GALLERY.map(([file, altKey]) => (
            <a key={file} href={`/screenshots/${file}`} target="_blank" rel="noreferrer">
              <img src={`/screenshots/${file}`} alt={t(altKey)} style={galleryThumb} loading="lazy" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// The landing moment is deep space in every theme — the card on top
// stays theme-colored, so day mode is a bright card floating in the
// dark rather than a squint. (Carson: "cool home page".)
const shell = {
  width: '100vw',
  height: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background:
    'radial-gradient(ellipse at 30% 20%, #16223f 0%, #060a18 70%)',
  color: 'var(--fg)',
  fontFamily: 'system-ui, -apple-system, sans-serif',
} as const;

/** A few fixed stars so the void isn't flat. Deterministic on purpose —
 *  the login screen shouldn't twinkle differently every render. */
const STARS: ReadonlyArray<[number, number, number, number]> = [
  [8, 12, 2, 0.9], [22, 78, 1.5, 0.5], [35, 30, 1, 0.7], [48, 88, 2, 0.4],
  [61, 15, 1.5, 0.8], [72, 55, 1, 0.5], [83, 25, 2, 0.7], [93, 70, 1.5, 0.6],
  [15, 45, 1, 0.4], [55, 40, 1, 0.35], [88, 90, 1, 0.5], [42, 8, 1.5, 0.6],
];

function StarField() {
  return (
    <>
      {STARS.map(([x, y, r, o], i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${x}vw`,
            top: `${y}vh`,
            width: r * 2,
            height: r * 2,
            borderRadius: '50%',
            background: '#e8f4ff',
            opacity: o * 0.6,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
}

const GALLERY: ReadonlyArray<[string, MessageKey]> = [
  ['observing.jpg', 'login.shot.observing'],
  ['playing.jpg', 'login.shot.playing'],
  ['chat-split.jpg', 'login.shot.chat'],
  ['seek-graph.jpg', 'login.shot.seek'],
];

const loginLangSelect = {
  padding: '4px 6px',
  background: 'var(--bg-input)',
  color: 'var(--fg)',
  border: '1px solid var(--border)',
  borderRadius: 3,
  fontSize: 12,
  fontFamily: 'inherit',
} as const;

const galleryRow = {
  display: 'flex',
  gap: 10,
  margin: '18px 0 24px',
  flexWrap: 'wrap',
  justifyContent: 'center',
  maxWidth: 640,
} as const;

const galleryThumb = {
  width: 148,
  borderRadius: 6,
  border: '1px solid #3d4c6e',
  display: 'block',
  opacity: 0.92,
} as const;

const loginIcon = {
  width: 72,
  height: 72,
  display: 'block',
  margin: '0 auto 6px',
} as const;

const mobileStop = {
  margin: 'auto',
  maxWidth: 420,
  padding: '32px 24px',
  textAlign: 'center',
  color: '#dfe8f5',
  fontSize: 15,
} as const;

const mobileTryAnyway = {
  marginTop: 18,
  background: 'transparent',
  color: '#8fb8f0',
  border: '1px solid #3d4c6e',
  borderRadius: 6,
  padding: '8px 14px',
  fontSize: 12.5,
  cursor: 'pointer',
} as const;

const card = {
  margin: '24px 0',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: 24,
  minWidth: 340,
  background: 'var(--bg-raised)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
} as const;

const brand = {
  fontSize: 20,
  fontWeight: 700,
  letterSpacing: 1,
} as const;

const tagline = {
  opacity: 0.6,
  fontSize: 12,
  marginBottom: 6,
} as const;

const row = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
} as const;

const label = {
  display: 'inline-block',
  width: 80,
  fontSize: 13,
  opacity: 0.8,
} as const;

const input = {
  flex: 1,
  padding: '6px 8px',
  background: 'var(--bg-input)',
  color: 'var(--fg)',
  border: '1px solid var(--border)',
  borderRadius: 3,
  fontSize: 13,
  fontFamily: 'inherit',
} as const;

const checks = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  marginTop: 8,
} as const;

const check = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 13,
  opacity: 0.9,
  cursor: 'pointer',
} as const;

const errStyle = {
  color: '#e68080',
  fontSize: 12,
  marginTop: 4,
} as const;

const submitBtn = {
  marginTop: 10,
  padding: '8px 18px',
  background: 'var(--accent-soft)',
  color: 'var(--fg)',
  border: '1px solid var(--accent)',
  borderRadius: 3,
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
} as const;

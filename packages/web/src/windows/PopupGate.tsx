import { useEffect, useState } from 'react';
import { LanguageSelect, useT } from '../i18n/react.js';
import type { MessageKey } from '../i18n/index.js';

/**
 * The "Almost there…" popup gate (Carson, 2026-08-12, watching a fresh
 * visitor's first minute on raptor3000.pages.dev): boards and chat are
 * real window.open windows, and a fresh origin has them blocked, so the
 * FIRST launch must say so prominently and walk the fix per browser.
 *
 * There is no Permissions API for popups — you cannot prompt for them
 * like notifications. What you CAN do is test honestly: the first
 * window.open in a click consumes the click's transient activation, so
 * a second immediate open runs with none — the same conditions as a
 * board window opening off a FICS socket event. If the second one
 * opens, the site is genuinely allowed and we remember that. If it's
 * blocked, the browser shows its popup icon in the address bar, which
 * IS the permission prompt — the directions point at it.
 *
 * 2026-08-14, the ease pass: the gate's job is to make that browser
 * surgery doable by someone who has never heard the word "popup".
 * Three moves: the instruction is a PICTURE of the visitor's own
 * browser (address-bar mock with the icon they must click), only their
 * browser is shown (the rest fold away), and nobody has to report
 * success — while blocked, the gate quietly re-runs the activation-less
 * test on focus and on an interval, so the moment they click "Allow"
 * it congratulates and gets out of the way on its own.
 *
 * `?popupgate=demo` forces the blocked rendering without testing or
 * persisting — for eyeballing the banner from an already-allowed
 * browser.
 */

const VERIFIED_KEY = 'raptor.popupsVerified';

/** How often the blocked gate re-tests on its own. Attempts while still
 *  blocked are invisible (that is what blocked means); the first allowed
 *  one costs a single open-and-close flash and ends the gate. */
export const RETEST_INTERVAL_MS = 4000;

/** A click or keypress grants ~5s of transient activation (Chrome), and a
 *  fresh-default browser ALLOWS gesture popups — so a single-open check
 *  inside that window measures with a gesture and lies "allowed" while
 *  socket-driven boards would still be blocked. Found live by Carson on
 *  2026-08-14 ("it says enabled … i didnt enable it"): he clicked the
 *  instructions, the next tick inherited the click. The watcher only
 *  measures after this much quiet. */
export const ACTIVATION_COOLDOWN_MS = 6000;

/** Whether an activation-less measurement is honest right now. */
export function quietLongEnough(lastInteraction: number, now: number): boolean {
  return now - lastInteraction >= ACTIVATION_COOLDOWN_MS;
}

export function popupsVerified(): boolean {
  try {
    return localStorage.getItem(VERIFIED_KEY) === 'true';
  } catch {
    return false;
  }
}

/** `?popupgate=demo` — render the blocked banner without testing. */
export function isDemoMode(
  search: string = typeof location !== 'undefined' ? location.search : '',
): boolean {
  return new URLSearchParams(search).get('popupgate') === 'demo';
}

export type PopupTestResult = 'allowed' | 'blocked';

/** The double-open test, window.open injectable for tests. */
export function runPopupTest(
  open: (url: string, name: string, features: string) => Window | null =
    (u, n, f) => window.open(u, n, f),
): PopupTestResult {
  const features = 'popup,width=240,height=100,left=60,top=60';
  // Consumes the click's transient activation (usually allowed even
  // when the site isn't) …
  const probe = open('about:blank', 'raptor-popup-probe', features);
  try {
    probe?.close();
  } catch {
    // cross-origin-safe: nothing to do
  }
  // … so THIS one runs activation-less, like a real board window.
  const real = open('about:blank', 'raptor-popup-test', features);
  if (!real) return 'blocked';
  try {
    real.close();
  } catch {
    // it opened; that's what we were measuring
  }
  return 'allowed';
}

/**
 * The automatic variant (Carson, 2026-08-12: "auto test board windows,
 * show it only when they are not available"). Runs on load and on the
 * gate's own re-test ticks, where there is no click to burn, so a
 * SINGLE open already has the activation-less conditions the
 * double-open test manufactures.
 */
export function runPopupAutoTest(
  open: (url: string, name: string, features: string) => Window | null =
    (u, n, f) => window.open(u, n, f),
): PopupTestResult {
  const w = open('about:blank', 'raptor-popup-test', 'popup,width=240,height=100,left=60,top=60');
  if (!w) return 'blocked';
  try {
    w.close();
  } catch {
    // it opened; that's what we were measuring
  }
  return 'allowed';
}

export interface BrowserDirection {
  key: string;
  /** Product name — the same in every language, so it is not a message. */
  name: string;
  stepsKey: MessageKey;
}

const DIRECTIONS: readonly BrowserDirection[] = [
  { key: 'chromium', name: 'Chrome / Brave / Edge', stepsKey: 'dir.chromium.steps' },
  { key: 'firefox', name: 'Firefox', stepsKey: 'dir.firefox.steps' },
  { key: 'safari', name: 'Safari (Mac)', stepsKey: 'dir.safari.steps' },
  { key: 'ios', name: 'iPhone / iPad', stepsKey: 'dir.ios.steps' },
  { key: 'android', name: 'Android Chrome', stepsKey: 'dir.android.steps' },
];

/** Best-effort UA match so the visitor's browser is listed first. */
export function detectBrowserKey(
  ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): string {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Firefox\//i.test(ua)) return 'firefox';
  if (/Safari\//i.test(ua) && !/Chrome|Chromium|Edg\//i.test(ua)) return 'safari';
  return 'chromium';
}

export function orderedDirections(currentKey: string): readonly BrowserDirection[] {
  return [...DIRECTIONS].sort((a, b) =>
    (b.key === currentKey ? 1 : 0) - (a.key === currentKey ? 1 : 0),
  );
}

// One auto-test per page load: StrictMode double-mounts effects in dev,
// and a revisit to the login screen within a load needn't flash again.
// The gate's own re-test loop updates this when the visitor allows.
let autoResultThisLoad: PopupTestResult | null = null;

function persist(result: PopupTestResult): void {
  try {
    if (result === 'allowed') localStorage.setItem(VERIFIED_KEY, 'true');
    else localStorage.removeItem(VERIFIED_KEY);
  } catch {
    // storage unavailable: the gate just re-tests next launch
  }
}

// ---- the pictures ---------------------------------------------------------
// An instruction that is a mock of the visitor's own browser beats any
// sentence. Inline SVG: no assets, themes with the card, and the icon they
// must find can pulse. Only chromium and firefox get pictures — those UIs
// are stable and near-universal here; the rest stay textual.

function ChromiumPicture() {
  const { t } = useT();
  return (
    <svg viewBox="0 0 384 150" style={picture} aria-hidden="true">
      {/* address bar */}
      <rect x="4" y="8" width="376" height="34" rx="17" fill="#101a33" stroke="#3d4c6e" />
      <circle cx="24" cy="25" r="7" fill="none" stroke="#67759b" strokeWidth="1.5" />
      <text x="40" y="30" fontSize="13" fill="#9fb3d9" fontFamily="system-ui">raptor3000.pages.dev</text>
      {/*
        BOTH blocked-popup icons, because they are not the same glyph
        (Carson, 2026-08-15, with a screenshot of his own Brave: "the
        icon you show and what brave shows do not match … neither
        billjr nor naomi could manage it last night").

        Chrome draws a little window with a red ✕ badge. Brave draws a
        monochrome window struck through with a diagonal slash — no
        red, no badge. Someone hunting the address bar for OUR icon
        never finds THEIRS, and stops.

        Drawing both, side by side under one pulse, is deliberately
        more robust than detecting the browser and drawing one: a
        detection that guesses wrong leaves the visitor hunting for an
        icon that isn't there, which is the exact failure being fixed.
        Two glyphs and "one of these is in your bar" cannot miss.
      */}
      <g>
        {/* Chrome / Edge: window + red ✕ badge */}
        <rect x="306" y="16" width="20" height="15" rx="2" fill="none" stroke="#dfe8f5" strokeWidth="1.6" />
        <line x1="306" y1="21" x2="326" y2="21" stroke="#dfe8f5" strokeWidth="1.6" />
        <circle cx="326" cy="30" r="6" fill="#c23b2e" />
        <path d="M323.6 27.6 l4.8 4.8 M328.4 27.6 l-4.8 4.8" stroke="#fff" strokeWidth="1.4" />

        {/* Brave: window with a second window notched at the corner,
            struck by a diagonal. Traced off Carson's screenshot. */}
        <rect x="344" y="15" width="19" height="14" rx="2" fill="none" stroke="#dfe8f5" strokeWidth="1.6" />
        <path d="M356 24 h8 v8" fill="none" stroke="#dfe8f5" strokeWidth="1.6" />
        <line x1="341" y1="12" x2="367" y2="34" stroke="#dfe8f5" strokeWidth="2.2" />

        {/* one pulse around the pair — the message is "in this corner,
            looking like one of these", not "this exact one" */}
        <circle cx="336" cy="23" r="20" fill="none" stroke="#8fb8f0" strokeWidth="2">
          <animate attributeName="r" values="18;30;18" dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;0;0.9" dur="1.8s" repeatCount="indefinite" />
        </circle>
      </g>
      {/* dropdown either icon opens */}
      <path d="M336 48 v8" stroke="#67759b" strokeDasharray="3 3" />
      <rect x="96" y="58" width="284" height="84" rx="8" fill="#17223e" stroke="#3d4c6e" />
      <circle cx="114" cy="80" r="6" fill="none" stroke="#79c19c" strokeWidth="2" />
      <circle cx="114" cy="80" r="2.6" fill="#79c19c" />
      <Label x={128} y={64} w={244} h={34} color="#dfe8f5">{t('gate.pic.allow')}</Label>
      <circle cx="114" cy="110" r="6" fill="none" stroke="#67759b" strokeWidth="1.5" />
      <Label x={128} y={101} w={170} h={20} color="#9fb3d9">{t('gate.pic.blocking')}</Label>
      <rect x="308" y="116" width="60" height="20" rx="5" fill="#4f7cd1" />
      <Label x={308} y={119} w={60} h={16} color="#fff" center>{t('gate.pic.done')}</Label>
    </svg>
  );
}

function FirefoxPicture() {
  const { t } = useT();
  return (
    <svg viewBox="0 0 384 118" style={picture} aria-hidden="true">
      {/* the infobar firefox drops below its toolbar */}
      <rect x="4" y="8" width="376" height="32" rx="6" fill="#101a33" stroke="#3d4c6e" />
      <rect x="16" y="17" width="14" height="11" rx="2" fill="none" stroke="#dfe8f5" strokeWidth="1.5" />
      <Label x={38} y={12} w={246} h={26} color="#dfe8f5">{t('gate.pic.ffBar')}</Label>
      <rect x="290" y="14" width="82" height="20" rx="5" fill="#4f7cd1" />
      <Label x={290} y={17} w={82} h={16} color="#fff" center>
        {t('gate.pic.ffPrefs')} ▾
      </Label>
      <circle cx="331" cy="24" r="16" fill="none" stroke="#8fb8f0" strokeWidth="2">
        <animate attributeName="r" values="14;22;14" dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.9;0;0.9" dur="1.8s" repeatCount="indefinite" />
      </circle>
      {/* its menu */}
      <path d="M331 42 v8" stroke="#67759b" strokeDasharray="3 3" />
      <rect x="130" y="54" width="250" height="52" rx="8" fill="#17223e" stroke="#3d4c6e" />
      <rect x="136" y="60" width="238" height="20" rx="4" fill="#22345c" />
      <Label x={146} y={62} w={222} h={18} color="#dfe8f5">{t('gate.pic.ffAllow')}</Label>
      <Label x={146} y={86} w={222} h={18} color="#9fb3d9">{t('gate.pic.ffEdit')}</Label>
    </svg>
  );
}

/**
 * A text run inside one of the mocks.
 *
 * `<foreignObject>` rather than `<text>` because SVG text does not wrap,
 * and these labels are translated now — "Always allow pop-ups and
 * redirects from this site" is 47 characters in English and 68 in
 * Norwegian, and a `<text>` element would simply run out past the edge
 * of the dropdown it is supposed to sit inside. HTML in a box wraps by
 * itself, in every language, with no per-language line breaks to
 * maintain.
 *
 * The box is sized to the shape it labels, so overflow clips rather than
 * spilling across the picture; `lang` is not set here because the
 * document already carries it.
 */
function Label({
  x,
  y,
  w,
  h,
  color,
  center,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  center?: boolean;
  children: React.ReactNode;
}) {
  return (
    <foreignObject x={x} y={y} width={w} height={h}>
      <div
        style={{
          font: '11px/1.25 system-ui, -apple-system, sans-serif',
          color,
          textAlign: center ? 'center' : 'start',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: center ? 'center' : 'flex-start',
          overflow: 'hidden',
        }}
      >
        <span>{children}</span>
      </div>
    </foreignObject>
  );
}

/** The one-browser instruction block: picture where we have one,
 *  sentence where we don't. */
function Instruction({ browserKey }: { browserKey: string }) {
  const { t, rich } = useT();
  if (browserKey === 'chromium') {
    return (
      <div>
        <div style={step}><span style={stepNum}>1</span><span>{t('gate.chromium.step1')}</span></div>
        <ChromiumPicture />
        <div style={caption}>{t('gate.chromium.caption')}</div>
        <div style={step}><span style={stepNum}>2</span><span>{rich('gate.chromium.step2')}</span></div>
      </div>
    );
  }
  if (browserKey === 'firefox') {
    return (
      <div>
        <div style={step}><span style={stepNum}>1</span><span>{t('gate.firefox.step1')}</span></div>
        <FirefoxPicture />
        <div style={caption}>{t('gate.firefox.caption')}</div>
        <div style={step}><span style={stepNum}>2</span><span>{rich('gate.firefox.step2')}</span></div>
      </div>
    );
  }
  const d = DIRECTIONS.find(x => x.key === browserKey) ?? DIRECTIONS[0];
  return <p style={gateP}>{t(d.stepsKey)}</p>;
}

/**
 * Auto-tested on mount, visible only on failure. Allowed renders
 * nothing — the working state needs no furniture. Blocked renders the
 * picture-instruction for the visitor's browser and then WAITS: an
 * activation-less re-test on window focus and every few seconds means
 * the visitor never has to report back that they clicked Allow — the
 * gate notices, says so, and leaves.
 */
export function PopupGate() {
  const { t, rich } = useT();
  const demo = isDemoMode();
  const [state, setState] = useState<'pending' | 'justAllowed' | PopupTestResult>(() => {
    if (demo) return 'blocked';
    return autoResultThisLoad ?? (popupsVerified() ? 'allowed' : 'pending');
  });
  // Demo only: Test again reports here instead of dismissing the banner —
  // a demo that vanishes on an allowed browser can't be looked at.
  const [demoVerdict, setDemoVerdict] = useState<PopupTestResult | null>(null);

  useEffect(() => {
    if (demo || autoResultThisLoad !== null) return;
    // Runs even when a past visit verified: an allowlist entry can be
    // revoked, and re-proving costs one invisible open-and-close.
    const result = runPopupAutoTest();
    autoResultThisLoad = result;
    persist(result);
    setState(result);
  }, [demo]);

  // The watcher: while blocked (and not a demo), re-test on focus — the
  // visitor comes straight back from the browser's own Allow UI — and on
  // a slow interval as a net. Blocked attempts are invisible by
  // definition; the first allowed one is the last. Every check waits out
  // the transient-activation window after any page interaction, or it
  // would measure the visitor's own click (see ACTIVATION_COOLDOWN_MS).
  // Clicks on the browser's chrome (the Allow dialog) grant the page
  // nothing, so the honest path — allow, come back — stays instant.
  useEffect(() => {
    if (demo || state !== 'blocked') return;
    let lastInteraction = 0;
    const note = () => { lastInteraction = Date.now(); };
    const check = () => {
      if (!quietLongEnough(lastInteraction, Date.now())) return;
      if (runPopupAutoTest() === 'allowed') {
        autoResultThisLoad = 'allowed';
        persist('allowed');
        setState('justAllowed');
      }
    };
    document.addEventListener('pointerdown', note, true);
    document.addEventListener('keydown', note, true);
    const iv = setInterval(check, RETEST_INTERVAL_MS);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      document.removeEventListener('pointerdown', note, true);
      document.removeEventListener('keydown', note, true);
      clearInterval(iv);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [state, demo]);

  // Let the congratulation sit for a breath, then get out of the way.
  useEffect(() => {
    if (state !== 'justAllowed') return;
    const t = setTimeout(() => setState('allowed'), 2800);
    return () => clearTimeout(t);
  }, [state]);

  if (state === 'allowed' || state === 'pending') return null;

  if (state === 'justAllowed') {
    return (
      <div style={{ ...gate, borderColor: '#3f7a5a' }}>
        <div style={{ ...gateTitle, color: '#8fd8ae' }}>✓ {t('gate.allowed.title')}</div>
        <p style={gateP}>{t('gate.allowed.body')}</p>
      </div>
    );
  }

  const retest = () => {
    const result = runPopupTest();
    if (demo) {
      setDemoVerdict(result);
      return;
    }
    autoResultThisLoad = result;
    persist(result);
    setState(result === 'allowed' ? 'justAllowed' : 'blocked');
  };

  const current = detectBrowserKey();
  return (
    <div style={gate}>
      <div style={gateTitleRow}>
        <div style={gateTitle}>
          {t('gate.title')}
          {demo ? <span style={demoChip}>{t('gate.demoChip')}</span> : null}
        </div>
        {/* First contact, so the language guess has to be correctable
            right here — a visitor who cannot read the gate cannot go
            find a language setting somewhere else. */}
        <LanguageSelect style={gateLangSelect} />
      </div>
      <p style={gateP}>{rich('gate.intro')}</p>
      <Instruction browserKey={current} />
      <div style={watchRow}>
        <svg viewBox="0 0 10 10" width="10" height="10" style={{ flexShrink: 0 }} aria-hidden="true">
          <circle cx="5" cy="5" r="4" fill="#8fb8f0">
            <animate attributeName="opacity" values="1;0.25;1" dur="1.6s" repeatCount="indefinite" />
          </circle>
        </svg>
        <span>{t('gate.watching')}</span>
      </div>
      <details style={others}>
        <summary style={{ cursor: 'pointer' }}>{t('gate.others')}</summary>
        <ul style={gateList}>
          {orderedDirections(current)
            .filter(d => d.key !== current)
            .map(d => (
              <li key={d.key} style={{ marginBottom: 6 }}>
                <strong>{d.name}</strong> — {t(d.stepsKey)}
              </li>
            ))}
        </ul>
      </details>
      <button type="button" style={gateButton} onClick={retest}>
        {t('gate.testAgain')}
      </button>
      {demo && demoVerdict ? (
        <span style={{ marginInlineStart: 12, fontSize: 12, color: demoVerdict === 'allowed' ? '#8fd8ae' : '#e8a08f' }}>
          {t(demoVerdict === 'allowed' ? 'gate.demo.allowed' : 'gate.demo.blocked')}
        </span>
      ) : null}
      <span style={{ marginInlineStart: 12, fontSize: 12, opacity: 0.8 }}>
        {t('gate.stuck')}{' '}
        <a
          href="https://github.com/cday-with-ai/Raptor3000/issues/new?labels=bug&title=Popup%20gate%3A%20"
          target="_blank"
          rel="noreferrer"
          style={{ color: '#8fb8f0' }}
        >
          {t('gate.report')}
        </a>
      </span>
    </div>
  );
}

const gate = {
  width: 'min(460px, calc(100vw - 48px))',
  boxSizing: 'border-box',
  // A flex item of the shell now, above the centered column: self-center
  // horizontally, hug the top, and never eat into the column's height.
  margin: '16px auto 0',
  flexShrink: 0,
  padding: '14px 18px',
  borderRadius: 10,
  border: '1px solid #3d4c6e',
  background: 'rgba(13, 22, 44, 0.85)',
  color: '#dfe8f5',
  fontSize: 13,
  lineHeight: 1.5,
  zIndex: 1,
} as const;

const gateTitleRow = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
} as const;

const gateTitle = {
  fontSize: 17,
  fontWeight: 700,
  letterSpacing: '0.02em',
  marginBottom: 4,
} as const;

// Deliberately quiet: the language control must be findable by someone
// who can't read the card, but it is not what the card is asking them
// to do.
const gateLangSelect = {
  flexShrink: 0,
  background: '#101a33',
  color: '#b7c6e2',
  border: '1px solid #3d4c6e',
  borderRadius: 5,
  padding: '3px 6px',
  fontSize: 12,
} as const;

const gateP = {
  margin: '6px 0',
} as const;

const gateList = {
  margin: '6px 0',
  paddingInlineStart: 18,
} as const;

const gateButton = {
  marginTop: 8,
  background: '#4f7cd1',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '7px 16px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
} as const;

const picture = {
  display: 'block',
  width: '100%',
  height: 'auto',
  margin: '8px 0 2px',
  // it LOOKS clickable by design; make sure it doesn't feel it
  pointerEvents: 'none',
  userSelect: 'none',
  // These mocks are drawn at fixed x coordinates, so an RTL document
  // (Hebrew) re-anchors every <text> and the address bar renders
  // clipped with the dropdown's labels outside their box — seen live
  // 2026-08-15. The picture is a diagram, not prose: pin it LTR and
  // let the Hebrew text around it flow as it should.
  direction: 'ltr',
} as const;

const caption = {
  fontSize: 11,
  color: '#8fa0c2',
  fontStyle: 'italic',
  margin: '0 0 4px',
} as const;

const step = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 8,
  margin: '8px 0 2px',
} as const;

const stepNum = {
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 18,
  height: 18,
  borderRadius: '50%',
  background: '#4f7cd1',
  color: '#fff',
  fontSize: 11,
  fontWeight: 700,
  transform: 'translateY(3px)',
} as const;

const watchRow = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  margin: '10px 0 4px',
  fontSize: 12,
  color: '#b7c6e2',
} as const;

const others = {
  margin: '8px 0 2px',
  fontSize: 12,
  color: '#b7c6e2',
} as const;

const demoChip = {
  marginInlineStart: 8,
  padding: '2px 8px',
  borderRadius: 99,
  border: '1px solid #9a7524',
  color: '#d8b263',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  verticalAlign: 'middle',
} as const;

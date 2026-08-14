import { useEffect, useState } from 'react';

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
  name: string;
  steps: string;
}

const DIRECTIONS: readonly BrowserDirection[] = [
  {
    key: 'chromium',
    name: 'Chrome / Brave / Edge',
    steps:
      'Click the popup icon at the right end of the address bar and pick "Always allow pop-ups and redirects from this site", then Done. (Or: Settings → Privacy → Site settings → Pop-ups and redirects → add this site.)',
  },
  {
    key: 'firefox',
    name: 'Firefox',
    steps:
      'A bar appears at the top when a popup is blocked — choose Preferences → "Allow pop-ups for this site". (Or: Settings → Privacy & Security → Permissions → Block pop-up windows → Exceptions.)',
  },
  {
    key: 'safari',
    name: 'Safari (Mac)',
    steps:
      'Safari menu → Settings → Websites → Pop-up Windows → set this site to Allow.',
  },
  {
    key: 'ios',
    name: 'iPhone / iPad',
    steps:
      'Settings app → Safari → turn OFF "Block Pop-ups". (Fair warning: phones get browser tabs instead of windows — a desktop is the real experience.)',
  },
  {
    key: 'android',
    name: 'Android Chrome',
    steps:
      '⋮ menu → Settings → Site settings → Pop-ups and redirects → allow. (Same fair warning — tabs, not windows.)',
  },
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
  return (
    <svg viewBox="0 0 384 150" style={picture} aria-hidden="true">
      {/* address bar */}
      <rect x="4" y="8" width="376" height="34" rx="17" fill="#101a33" stroke="#3d4c6e" />
      <circle cx="24" cy="25" r="7" fill="none" stroke="#67759b" strokeWidth="1.5" />
      <text x="40" y="30" fontSize="13" fill="#9fb3d9" fontFamily="system-ui">raptor3000.pages.dev</text>
      {/* the blocked-popup icon: a little window with a red x */}
      <g>
        <rect x="336" y="16" width="20" height="15" rx="2" fill="none" stroke="#dfe8f5" strokeWidth="1.6" />
        <line x1="336" y1="21" x2="356" y2="21" stroke="#dfe8f5" strokeWidth="1.6" />
        <circle cx="356" cy="30" r="6" fill="#c23b2e" />
        <path d="M353.6 27.6 l4.8 4.8 M358.4 27.6 l-4.8 4.8" stroke="#fff" strokeWidth="1.4" />
        {/* pulse to say THIS one */}
        <circle cx="346" cy="24" r="14" fill="none" stroke="#8fb8f0" strokeWidth="2">
          <animate attributeName="r" values="12;20;12" dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;0;0.9" dur="1.8s" repeatCount="indefinite" />
        </circle>
      </g>
      {/* dropdown the icon opens */}
      <path d="M346 46 v10" stroke="#67759b" strokeDasharray="3 3" />
      <rect x="96" y="58" width="284" height="84" rx="8" fill="#17223e" stroke="#3d4c6e" />
      <circle cx="114" cy="80" r="6" fill="none" stroke="#79c19c" strokeWidth="2" />
      <circle cx="114" cy="80" r="2.6" fill="#79c19c" />
      <text x="128" y="77" fontSize="11" fill="#dfe8f5" fontFamily="system-ui">Always allow pop-ups and redirects</text>
      <text x="128" y="91" fontSize="11" fill="#dfe8f5" fontFamily="system-ui">from this site</text>
      <circle cx="114" cy="110" r="6" fill="none" stroke="#67759b" strokeWidth="1.5" />
      <text x="128" y="114" fontSize="11" fill="#9fb3d9" fontFamily="system-ui">Continue blocking</text>
      <rect x="308" y="116" width="60" height="20" rx="5" fill="#4f7cd1" />
      <text x="338" y="130" fontSize="11" fill="#fff" fontFamily="system-ui" textAnchor="middle">Done</text>
    </svg>
  );
}

function FirefoxPicture() {
  return (
    <svg viewBox="0 0 384 118" style={picture} aria-hidden="true">
      {/* the infobar firefox drops below its toolbar */}
      <rect x="4" y="8" width="376" height="32" rx="6" fill="#101a33" stroke="#3d4c6e" />
      <rect x="16" y="17" width="14" height="11" rx="2" fill="none" stroke="#dfe8f5" strokeWidth="1.5" />
      <text x="40" y="28" fontSize="11" fill="#dfe8f5" fontFamily="system-ui">Firefox prevented this site from opening a pop-up window</text>
      <rect x="290" y="14" width="82" height="20" rx="5" fill="#4f7cd1" />
      <text x="331" y="28" fontSize="11" fill="#fff" fontFamily="system-ui" textAnchor="middle">Preferences ▾</text>
      <circle cx="331" cy="24" r="16" fill="none" stroke="#8fb8f0" strokeWidth="2">
        <animate attributeName="r" values="14;22;14" dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.9;0;0.9" dur="1.8s" repeatCount="indefinite" />
      </circle>
      {/* its menu */}
      <path d="M331 42 v8" stroke="#67759b" strokeDasharray="3 3" />
      <rect x="130" y="54" width="250" height="52" rx="8" fill="#17223e" stroke="#3d4c6e" />
      <rect x="136" y="60" width="238" height="20" rx="4" fill="#22345c" />
      <text x="146" y="74" fontSize="11" fill="#dfe8f5" fontFamily="system-ui">Allow pop-ups for raptor3000.pages.dev</text>
      <text x="146" y="98" fontSize="11" fill="#9fb3d9" fontFamily="system-ui">Edit Pop-up Blocker Options…</text>
    </svg>
  );
}

/** The one-browser instruction block: picture where we have one,
 *  sentence where we don't. */
function Instruction({ browserKey }: { browserKey: string }) {
  if (browserKey === 'chromium') {
    return (
      <div>
        <div style={step}><span style={stepNum}>1</span><span>Find this icon at the right end of your address bar — it appeared just now:</span></div>
        <ChromiumPicture />
        <div style={caption}>(just a picture — the real one is up in your browser&apos;s own bar)</div>
        <div style={step}><span style={stepNum}>2</span><span>Click it, pick <strong>Always allow</strong>, then <strong>Done</strong>. That&apos;s the whole job.</span></div>
      </div>
    );
  }
  if (browserKey === 'firefox') {
    return (
      <div>
        <div style={step}><span style={stepNum}>1</span><span>A bar just appeared at the top of the page:</span></div>
        <FirefoxPicture />
        <div style={caption}>(just a picture — the real bar is Firefox&apos;s own, above the page)</div>
        <div style={step}><span style={stepNum}>2</span><span>Click <strong>Preferences</strong> and pick <strong>Allow pop-ups for raptor3000.pages.dev</strong>.</span></div>
      </div>
    );
  }
  const d = DIRECTIONS.find(x => x.key === browserKey) ?? DIRECTIONS[0];
  return <p style={gateP}>{d.steps}</p>;
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
        <div style={{ ...gateTitle, color: '#8fd8ae' }}>✓ Pop-ups allowed</div>
        <p style={gateP}>Board and chat windows will open. Enjoy.</p>
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
      <div style={gateTitle}>
        Almost there…
        {demo ? <span style={demoChip}>demo</span> : null}
      </div>
      <p style={gateP}>
        Raptor3000 plays like a desktop app — chat and every board open as{' '}
        <strong>real windows</strong>. Your browser is blocking them, and
        fixing that takes two clicks:
      </p>
      <Instruction browserKey={current} />
      <div style={watchRow}>
        <svg viewBox="0 0 10 10" width="10" height="10" style={{ flexShrink: 0 }} aria-hidden="true">
          <circle cx="5" cy="5" r="4" fill="#8fb8f0">
            <animate attributeName="opacity" values="1;0.25;1" dur="1.6s" repeatCount="indefinite" />
          </circle>
        </svg>
        <span>
          No need to tell anyone — this screen checks by itself and steps
          aside the moment windows are allowed.
        </span>
      </div>
      <details style={others}>
        <summary style={{ cursor: 'pointer' }}>Using a different browser?</summary>
        <ul style={gateList}>
          {orderedDirections(current)
            .filter(d => d.key !== current)
            .map(d => (
              <li key={d.key} style={{ marginBottom: 6 }}>
                <strong>{d.name}</strong> — {d.steps}
              </li>
            ))}
        </ul>
      </details>
      <button type="button" style={gateButton} onClick={retest}>
        Test again
      </button>
      {demo && demoVerdict ? (
        <span style={{ marginLeft: 12, fontSize: 12, color: demoVerdict === 'allowed' ? '#8fd8ae' : '#e8a08f' }}>
          demo — this browser right now: pop-ups {demoVerdict}
        </span>
      ) : null}
      <span style={{ marginLeft: 12, fontSize: 12, opacity: 0.8 }}>
        Still stuck?{' '}
        <a
          href="https://github.com/cday-with-ai/Raptor3000/issues/new?labels=bug&title=Popup%20gate%3A%20"
          target="_blank"
          rel="noreferrer"
          style={{ color: '#8fb8f0' }}
        >
          report it
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

const gateTitle = {
  fontSize: 17,
  fontWeight: 700,
  letterSpacing: '0.02em',
  marginBottom: 4,
} as const;

const gateP = {
  margin: '6px 0',
} as const;

const gateList = {
  margin: '6px 0',
  paddingLeft: 18,
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
  marginLeft: 8,
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

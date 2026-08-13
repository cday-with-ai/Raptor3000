import { useState } from 'react';

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
 */

const VERIFIED_KEY = 'raptor.popupsVerified';

export function popupsVerified(): boolean {
  try {
    return localStorage.getItem(VERIFIED_KEY) === 'true';
  } catch {
    return false;
  }
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
 * show it only when they are not available"). Runs on load, where there
 * is no click to burn, so a SINGLE open already has the activation-less
 * conditions the double-open test manufactures. Allowed sites open it;
 * everyone else gets 'blocked' and the browser lights its popup icon —
 * which is the prompt the directions point at.
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
      'After a blocked test, click the popup icon at the right end of the address bar and pick "Always allow pop-ups and redirects from this site". (Or: Settings → Privacy → Site settings → Pop-ups and redirects → add this site.)',
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
let autoResultThisLoad: PopupTestResult | null = null;

function persist(result: PopupTestResult): void {
  try {
    if (result === 'allowed') localStorage.setItem(VERIFIED_KEY, 'true');
    else localStorage.removeItem(VERIFIED_KEY);
  } catch {
    // storage unavailable: the gate just re-tests next launch
  }
}

/**
 * Auto-tested on mount, visible only on failure (Carson, 2026-08-12:
 * "auto test board windows and show that at the top only when they are
 * not available"). Allowed renders nothing — the working state needs no
 * furniture. Blocked renders the banner with per-browser directions and
 * a manual re-test button (that click has activation to burn, so the
 * button uses the honest double-open test).
 */
export function PopupGate() {
  const [state, setState] = useState<'pending' | PopupTestResult>(() =>
    autoResultThisLoad ?? (popupsVerified() ? 'allowed' : 'pending'),
  );

  useEffect(() => {
    if (autoResultThisLoad !== null) return;
    // Runs even when a past visit verified: an allowlist entry can be
    // revoked, and re-proving costs one invisible open-and-close.
    const result = runPopupAutoTest();
    autoResultThisLoad = result;
    persist(result);
    setState(result);
  }, []);

  if (state !== 'blocked') return null;

  const retest = () => {
    const result = runPopupTest();
    autoResultThisLoad = result;
    persist(result);
    setState(result);
  };

  const current = detectBrowserKey();
  return (
    <div style={gate}>
      <div style={gateTitle}>Board windows are blocked</div>
      <p style={gateP}>
        Raptor3000 opens boards and chat as <strong>real browser
        windows</strong>, and they arrive from the server — not from your
        clicks — so your browser must allow popups for this site. Right
        now it doesn&apos;t:
      </p>
      <ul style={gateList}>
        {orderedDirections(current).map(d => (
          <li key={d.key} style={{ marginBottom: 6 }}>
            <strong>
              {d.name}
              {d.key === current ? ' (your browser)' : ''}
            </strong>{' '}
            — {d.steps}
          </li>
        ))}
      </ul>
      <button type="button" style={gateButton} onClick={retest}>
        Test again
      </button>
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
  width: 'min(420px, calc(100vw - 48px))',
  boxSizing: 'border-box',
  margin: '24px 0 -8px',
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

import { describe, it, expect } from 'vitest';
import {
  ACTIVATION_COOLDOWN_MS,
  detectBrowserKey,
  isDemoMode,
  orderedDirections,
  quietLongEnough,
  runPopupAutoTest,
  runPopupTest,
} from '../windows/PopupGate.js';

/**
 * The popup gate (2026-08-12): there is no Permissions API for popups,
 * so the gate tests honestly — first open consumes the click's
 * transient activation, the second runs activation-less like a board
 * window off a socket event. These tests pin the double-open contract
 * and the per-browser direction ordering.
 */

describe('runPopupTest', () => {
  it('opens twice and reports allowed when the second succeeds', () => {
    const names: string[] = [];
    const fakeWin = { close: () => undefined } as unknown as Window;
    const result = runPopupTest((_u, name) => {
      names.push(name);
      return fakeWin;
    });
    expect(result).toBe('allowed');
    expect(names).toEqual(['raptor-popup-probe', 'raptor-popup-test']);
  });

  it('reports blocked when the activation-less second open fails', () => {
    const fakeWin = { close: () => undefined } as unknown as Window;
    const result = runPopupTest((_u, name) =>
      name === 'raptor-popup-probe' ? fakeWin : null,
    );
    expect(result).toBe('blocked');
  });

  it('a close() that throws does not turn allowed into a crash', () => {
    const grumpy = {
      close: () => {
        throw new Error('COOP says no');
      },
    } as unknown as Window;
    expect(runPopupTest(() => grumpy)).toBe('allowed');
  });
});

describe('runPopupAutoTest', () => {
  // The on-load variant: no click to burn, so a single open is already
  // activation-less — the exact conditions of a board window opening
  // off a socket event.
  it('opens once and reports what the browser decided', () => {
    const names: string[] = [];
    const fakeWin = { close: () => undefined } as unknown as Window;
    expect(
      runPopupAutoTest((_u, name) => {
        names.push(name);
        return fakeWin;
      }),
    ).toBe('allowed');
    expect(names).toEqual(['raptor-popup-test']);
    expect(runPopupAutoTest(() => null)).toBe('blocked');
  });

  it('a close() that throws still reports allowed', () => {
    const grumpy = {
      close: () => {
        throw new Error('COOP says no');
      },
    } as unknown as Window;
    expect(runPopupAutoTest(() => grumpy)).toBe('allowed');
  });
});

describe('detectBrowserKey', () => {
  it('recognizes the majors', () => {
    expect(detectBrowserKey('Mozilla/5.0 (X11; Linux) Firefox/128.0')).toBe('firefox');
    expect(
      detectBrowserKey('Mozilla/5.0 (Macintosh) AppleWebKit/605 Version/17 Safari/605.1'),
    ).toBe('safari');
    expect(
      detectBrowserKey('Mozilla/5.0 (Windows) Chrome/126.0 Safari/537.36 Edg/126.0'),
    ).toBe('chromium');
    expect(
      detectBrowserKey('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Version/17 Mobile Safari'),
    ).toBe('ios');
    expect(
      detectBrowserKey('Mozilla/5.0 (Linux; Android 14) Chrome/126 Mobile Safari/537.36'),
    ).toBe('android');
    expect(detectBrowserKey('Mozilla/5.0 Chrome/126.0 Safari/537.36')).toBe('chromium');
  });
});

describe('orderedDirections', () => {
  it("puts the visitor's browser first and keeps all five", () => {
    const ordered = orderedDirections('ios');
    expect(ordered[0].key).toBe('ios');
    expect(ordered).toHaveLength(5);
  });
});

describe('quietLongEnough', () => {
  // The watcher's false-positive guard (found live 2026-08-14): a page
  // click grants ~5s of transient activation, and a fresh-default browser
  // ALLOWS gesture popups — so an "activation-less" check inside that
  // window inherits the click and lies "allowed". Checks must wait out
  // the whole window.
  it('holds the check inside the activation window and releases after', () => {
    const clickAt = 100_000;
    expect(quietLongEnough(clickAt, clickAt + 1)).toBe(false);
    expect(quietLongEnough(clickAt, clickAt + 5_000)).toBe(false);
    expect(quietLongEnough(clickAt, clickAt + ACTIVATION_COOLDOWN_MS - 1)).toBe(false);
    expect(quietLongEnough(clickAt, clickAt + ACTIVATION_COOLDOWN_MS)).toBe(true);
  });

  it('the cooldown outlasts the ~5s transient-activation window', () => {
    expect(ACTIVATION_COOLDOWN_MS).toBeGreaterThan(5_000);
  });
});

describe('isDemoMode', () => {
  // ?popupgate=demo renders the blocked banner without testing or
  // persisting — the way to see the gate from an already-allowed browser.
  it('matches exactly popupgate=demo', () => {
    expect(isDemoMode('?popupgate=demo')).toBe(true);
    expect(isDemoMode('?window=board&id=3&popupgate=demo')).toBe(true);
    expect(isDemoMode('')).toBe(false);
    expect(isDemoMode('?popupgate=1')).toBe(false);
    expect(isDemoMode('?window=chat')).toBe(false);
  });
});

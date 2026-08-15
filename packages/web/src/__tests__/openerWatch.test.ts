import { describe, it, expect, vi } from 'vitest';
import {
  OPENER_POLL_MS,
  installOpenerWatch,
  shouldSelfClose,
} from '../windows/openerWatch.js';

/**
 * A popup must close itself when the window holding the FICS socket goes
 * away (Carson, 2026-08-14: "i think i am a dumbass, it was me closing
 * the raptor3000 tab which disconnected"). The trap is the other case —
 * a window opened by pasting its URL has no opener and never had one,
 * and must be left alone for the Orphaned screen.
 */

describe('shouldSelfClose', () => {
  it('closes a popup whose opener has gone', () => {
    expect(shouldSelfClose({ sawOpener: true, hasOpener: false })).toBe(true);
  });

  it('leaves a popup whose opener is alive', () => {
    expect(shouldSelfClose({ sawOpener: true, hasOpener: true })).toBe(false);
  });

  it('never closes a window that never had an opener', () => {
    // A pasted `?window=board&id=42` in a fresh tab. This is the case
    // that must not self-destruct — the Orphaned screen owns it.
    expect(shouldSelfClose({ sawOpener: false, hasOpener: false })).toBe(false);
  });
});

describe('installOpenerWatch', () => {
  function withOpener(opener: { closed: boolean } | null) {
    const g = globalThis as Record<string, unknown>;
    const prev = g.window;
    g.window = { get opener() { return opener; } };
    return () => { g.window = prev; };
  }

  it('closes once the opener reports closed', () => {
    const opener = { closed: false };
    const restore = withOpener(opener);
    vi.useFakeTimers();
    const close = vi.fn();
    try {
      installOpenerWatch(close, 10);
      vi.advanceTimersByTime(30);
      expect(close).not.toHaveBeenCalled();

      opener.closed = true;
      vi.advanceTimersByTime(10);
      expect(close).toHaveBeenCalledTimes(1);

      // And only once — the interval is cleared on the way out, so a
      // window that ignores close() isn't hammered forever.
      vi.advanceTimersByTime(100);
      expect(close).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
      restore();
    }
  });

  it('leaves an opener-less window alone forever', () => {
    const restore = withOpener(null);
    vi.useFakeTimers();
    const close = vi.fn();
    try {
      installOpenerWatch(close, 10);
      vi.advanceTimersByTime(1000);
      expect(close).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
      restore();
    }
  });

  it('cleanup stops the polling', () => {
    const opener = { closed: false };
    const restore = withOpener(opener);
    vi.useFakeTimers();
    const close = vi.fn();
    try {
      const stop = installOpenerWatch(close, 10);
      stop();
      opener.closed = true;
      vi.advanceTimersByTime(100);
      expect(close).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
      restore();
    }
  });

  it('polls often enough to feel immediate', () => {
    expect(OPENER_POLL_MS).toBeLessThanOrEqual(1000);
  });
});

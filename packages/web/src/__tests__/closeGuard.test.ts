import { describe, it, expect } from 'vitest';
import {
  installCloseGuard,
  partingCommands,
  type PageTransitionish,
} from '../windows/closeGuard.js';

/**
 * Closing a window (Carson, 2026-08-15): ask before closing on a live
 * game, and going through with it resigns.
 *
 * The test that earns its place is the CANCEL one. `beforeunload` fires
 * when the dialog is raised, not when it is answered, so wiring the
 * resign to that event resigns your game every time you consider
 * closing the tab and think better of it. Nothing about that failure is
 * visible in review — the code reads exactly like the working version —
 * and its consequence is a lost game that cannot be undone.
 */

function fakeWindow() {
  const handlers = new Map<string, ((e: PageTransitionish) => void)[]>();
  return {
    addEventListener: (t: string, fn: (e: PageTransitionish) => void) => {
      handlers.set(t, [...(handlers.get(t) ?? []), fn]);
    },
    removeEventListener: (t: string, fn: (e: PageTransitionish) => void) => {
      handlers.set(t, (handlers.get(t) ?? []).filter(f => f !== fn));
    },
    fire: (t: string, e: PageTransitionish = {}) => {
      for (const fn of handlers.get(t) ?? []) fn(e);
      return e;
    },
    count: (t: string) => (handlers.get(t) ?? []).length,
  };
}

describe('installCloseGuard', () => {
  it('arms the dialog only while a game of ours is live', () => {
    const w = fakeWindow();
    let playing = false;
    installCloseGuard({ ...w, isPlaying: () => playing, onLeaving: () => {} });

    let prevented = false;
    const idle = w.fire('beforeunload', { preventDefault: () => { prevented = true; } });
    expect(prevented, 'an idle close must not prompt').toBe(false);
    expect(idle.returnValue).toBeUndefined();

    playing = true;
    const live = w.fire('beforeunload', { preventDefault: () => { prevented = true; } });
    expect(prevented, 'a close mid-game must prompt').toBe(true);
    expect(live.returnValue).toBe('');
  });

  it('does NOT act on beforeunload — the dialog can still be cancelled', () => {
    const w = fakeWindow();
    let left = 0;
    installCloseGuard({ ...w, isPlaying: () => true, onLeaving: () => { left++; } });

    w.fire('beforeunload', { preventDefault: () => {} });
    expect(left, 'showing the dialog is not leaving').toBe(0);

    // Thought better of it, twice, then finally closed.
    w.fire('beforeunload', { preventDefault: () => {} });
    expect(left).toBe(0);
    w.fire('pagehide', {});
    expect(left, 'and now it really left').toBe(1);
  });

  it('acts on a real departure even when no game is live', () => {
    // An observed board still owes FICS an unobserve on the way out —
    // the half Carson caught misbehaving ("you are observing game(s)
    // 7 and 16" after the windows were gone).
    const w = fakeWindow();
    let left = 0;
    installCloseGuard({ ...w, isPlaying: () => false, onLeaving: () => { left++; } });
    w.fire('pagehide', {});
    expect(left).toBe(1);
  });

  it('treats a bfcached page as still alive', () => {
    const w = fakeWindow();
    let left = 0;
    installCloseGuard({ ...w, isPlaying: () => true, onLeaving: () => { left++; } });
    w.fire('pagehide', { persisted: true });
    expect(left, 'a cached page can come back; it has not left').toBe(0);
  });

  it('unhooks both events on teardown', () => {
    const w = fakeWindow();
    const off = installCloseGuard({ ...w, isPlaying: () => true, onLeaving: () => {} });
    expect(w.count('beforeunload')).toBe(1);
    expect(w.count('pagehide')).toBe(1);
    off();
    expect(w.count('beforeunload')).toBe(0);
    expect(w.count('pagehide')).toBe(0);
  });
});

describe('partingCommands', () => {
  it('says goodbye to every observed game by id', () => {
    expect(
      partingCommands({ playing: false, observing: ['7', '16'], examining: false }),
    ).toEqual(['unobserve 7', 'unobserve 16']);
  });

  it('sends nothing when there is nothing to leave', () => {
    expect(
      partingCommands({ playing: false, observing: [], examining: false }),
    ).toEqual([]);
  });

  it('resigns LAST, after everything else has been said', () => {
    const out = partingCommands({
      playing: true,
      observing: ['7'],
      examining: true,
    });
    expect(out).toEqual(['unobserve 7', 'unexamine', 'resign']);
    expect(out.at(-1), 'resign ends the game and must go last').toBe('resign');
  });

  it('never resigns a game we are not playing', () => {
    // The expensive mistake: resigning because a board was open, rather
    // than because it was OUR game.
    const out = partingCommands({
      playing: false,
      observing: ['7', '9'],
      examining: true,
    });
    expect(out).not.toContain('resign');
  });
});

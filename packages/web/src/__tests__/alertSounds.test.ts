import { describe, it, expect, vi } from 'vitest';
import {
  ALERT_KINDS,
  ALERT_RECIPES,
  alertKindFor,
  installAlertSounds,
  type AlertKind,
} from '../alertSounds.js';
import { MOVE_SOUND_SETS } from '../sounds.js';
import { ChatService, ChatEventType, makeChatEvent } from '@raptor3000/shared';

/**
 * The alert sounds are data (recipes) plus a bus subscriber; both halves
 * are assertable without an AudioContext. The recipe invariants are the
 * design contract: every palette speaks in its own voice, and arrivals
 * rise while departures fall in all of them, so the ear learns one
 * vocabulary, not ten.
 */

describe('alert recipes', () => {
  it('every palette has every kind', () => {
    for (const set of MOVE_SOUND_SETS) {
      for (const kind of ALERT_KINDS) {
        expect(ALERT_RECIPES[set][kind].notes.length).toBeGreaterThan(0);
      }
    }
  });

  it('arrive rises and depart falls, in every palette', () => {
    for (const set of MOVE_SOUND_SETS) {
      const arrive = ALERT_RECIPES[set].arrive.notes;
      const depart = ALERT_RECIPES[set].depart.notes;
      for (let i = 1; i < arrive.length; i++) {
        expect(arrive[i].freq).toBeGreaterThan(arrive[i - 1].freq);
      }
      for (let i = 1; i < depart.length; i++) {
        expect(depart[i].freq).toBeLessThan(depart[i - 1].freq);
      }
    }
  });

  it('the three kinds are distinct within each palette', () => {
    for (const set of MOVE_SOUND_SETS) {
      const shapes = ALERT_KINDS.map(k =>
        JSON.stringify(ALERT_RECIPES[set][k].notes),
      );
      expect(new Set(shapes).size).toBe(ALERT_KINDS.length);
    }
  });

  it('each palette is its own recipe, and does not switch voices between kinds', () => {
    const fingerprints = MOVE_SOUND_SETS.map(s => {
      const r = ALERT_RECIPES[s].tell;
      return JSON.stringify({
        wave: r.wave,
        filterHz: r.filterHz ?? null,
        vol: r.vol,
        attack: r.attack,
        release: r.release,
        notes: r.notes,
      });
    });
    expect(new Set(fingerprints).size).toBe(MOVE_SOUND_SETS.length);
    for (const set of MOVE_SOUND_SETS) {
      for (const kind of ALERT_KINDS) {
        expect(ALERT_RECIPES[set][kind].wave).toBe(ALERT_RECIPES[set].tell.wave);
      }
    }
  });

  it('alerts are short and subtle — under a second, under the verdict volume', () => {
    for (const set of MOVE_SOUND_SETS) {
      for (const kind of ALERT_KINDS) {
        const r = ALERT_RECIPES[set][kind];
        const end = Math.max(...r.notes.map(n => n.at + n.dur)) + r.release;
        expect(end).toBeLessThanOrEqual(1.0);
        expect(r.vol).toBeLessThanOrEqual(0.45);
        expect(r.attack).toBeGreaterThan(0);
        expect(r.release).toBeGreaterThan(0);
        expect(r.notes.length).toBeLessThanOrEqual(6);
      }
    }
  });
});

describe('alertKindFor', () => {
  it('tells (person and partner) alert as tell; notify arrivals/departures as themselves', () => {
    expect(alertKindFor(ChatEventType.TELL)).toBe('tell');
    expect(alertKindFor(ChatEventType.PARTNER_TELL)).toBe('tell');
    expect(alertKindFor(ChatEventType.NOTIFICATION_ARRIVAL)).toBe('arrive');
    expect(alertKindFor(ChatEventType.NOTIFICATION_DEPARTURE)).toBe('depart');
  });

  it('ambient traffic stays silent — channels, shouts, game chat, bots, meta', () => {
    for (const t of [
      ChatEventType.CHANNEL_TELL,
      ChatEventType.SHOUT,
      ChatEventType.CSHOUT,
      ChatEventType.KIBITZ,
      ChatEventType.WHISPER,
      ChatEventType.QTELL,
      ChatEventType.TOLD,
      ChatEventType.INTERNAL,
      ChatEventType.OUTBOUND,
      ChatEventType.UNKNOWN,
    ]) {
      expect(alertKindFor(t)).toBeNull();
    }
  });
});

type AlertPrefs = { soundMode: 'on' | 'off'; alertSounds: 'on' | 'off' };

function harness(prefs: AlertPrefs = { soundMode: 'on', alertSounds: 'on' }) {
  const chat = new ChatService();
  const played: AlertKind[] = [];
  let p = prefs;
  const uninstall = installAlertSounds(chat, {
    prefs: () => p,
    play: k => played.push(k),
  });
  return {
    chat,
    played,
    uninstall,
    setPrefs: (next: typeof prefs) => {
      p = next;
    },
  };
}

const tell = () =>
  makeChatEvent(ChatEventType.TELL, 'Bob tells you: hi', { source: 'Bob' });

describe('installAlertSounds', () => {
  it('an incoming tell plays exactly one tell alert', () => {
    const h = harness();
    h.chat.publish(tell());
    expect(h.played).toEqual(['tell']);
  });

  it('arrivals and departures play their own kinds', () => {
    const h = harness();
    h.chat.publish(
      makeChatEvent(ChatEventType.NOTIFICATION_ARRIVAL, 'Notification: Bob has arrived.'),
    );
    h.chat.publish(
      makeChatEvent(ChatEventType.NOTIFICATION_DEPARTURE, 'Notification: Bob has departed.'),
    );
    expect(h.played).toEqual(['arrive', 'depart']);
  });

  it('gated by the master soundMode AND the alertSounds preference, read per event', () => {
    const h = harness({ soundMode: 'off', alertSounds: 'on' });
    h.chat.publish(tell());
    h.setPrefs({ soundMode: 'on', alertSounds: 'off' });
    h.chat.publish(tell());
    expect(h.played).toEqual([]);
    h.setPrefs({ soundMode: 'on', alertSounds: 'on' });
    h.chat.publish(tell());
    expect(h.played).toEqual(['tell']);
  });

  it('ambient traffic through the unconditional fallback path stays silent', () => {
    // With no other listeners, an unconsumed event reaches fallback
    // handlers UNCONDITIONALLY — accepts() is not consulted on that path
    // (ChatService.publish). handle() must therefore filter for itself.
    const h = harness();
    h.chat.publish(makeChatEvent(ChatEventType.SHOUT, 'Bob shouts: hello'));
    h.chat.publish(makeChatEvent(ChatEventType.UNKNOWN, 'noise'));
    expect(h.played).toEqual([]);
  });

  it('does not change routing: an unconsumed tell still reaches the main console unconditionally', () => {
    // The alert listener is a FALLBACK listener on purpose. Were it a
    // specific listener, its accepting a TELL would flip
    // consumedBySpecific and a main-console handler would suddenly be
    // gated on its own accepts() for events nothing displays.
    const h = harness();
    const consoleGot: string[] = [];
    h.chat.addMainConsoleListener({
      id: 'test-console',
      accepts: () => false, // deliberately blind — only the unconditional path feeds it
      handle: e => consoleGot.push(e.type),
    });
    h.chat.publish(tell());
    expect(consoleGot).toEqual([ChatEventType.TELL]);
    expect(h.played).toEqual(['tell']);
  });

  it('uninstall silences it', () => {
    const h = harness();
    h.uninstall();
    h.chat.publish(tell());
    expect(h.played).toEqual([]);
  });
});

/**
 * The silence bug of 2026-08-14, reported four times ("i told myself
 * something and didnt hear a sound"). The subscriber was never at fault
 * — every test above passed while the app made no sound — because the
 * failure was one layer down, in whether the AudioContext could run at
 * all. These pin the two mechanisms that fix it.
 */
describe('alert audio unlocking', () => {
  type FakeCtx = { state: string; resume: () => Promise<void> };

  function withFakeAudio(initial: string) {
    const made: FakeCtx[] = [];
    const listeners = new Map<string, Set<(e?: unknown) => void>>();
    const ctor = function () {
      const c: FakeCtx = {
        state: initial,
        resume: () => {
          c.state = 'running';
          return Promise.resolve();
        },
      };
      made.push(c);
      return c;
    };
    const doc = {
      addEventListener: (t: string, fn: (e?: unknown) => void) => {
        (listeners.get(t) ?? listeners.set(t, new Set()).get(t)!).add(fn);
      },
      removeEventListener: (t: string, fn: (e?: unknown) => void) => {
        listeners.get(t)?.delete(fn);
      },
    };
    return {
      made,
      doc,
      ctor,
      gesture: (t = 'pointerdown') => {
        for (const fn of [...(listeners.get(t) ?? [])]) fn();
      },
      armed: () =>
        (listeners.get('pointerdown')?.size ?? 0) +
        (listeners.get('keydown')?.size ?? 0),
    };
  }

  it('a gesture is what creates and resumes the context', async () => {
    const fake = withFakeAudio('suspended');
    const g = globalThis as Record<string, unknown>;
    const prevCtx = g.AudioContext;
    const prevDoc = g.document;
    g.AudioContext = fake.ctor;
    g.document = fake.doc;
    try {
      vi.resetModules();
      const { unlockAlertAudio } = await import('../alertSounds.js');
      unlockAlertAudio();
      // Armed but nothing built: a context created outside a gesture is
      // the whole bug, so it must not be built on install.
      expect(fake.made).toHaveLength(0);
      expect(fake.armed()).toBe(2);

      fake.gesture();
      expect(fake.made).toHaveLength(1);
      await Promise.resolve();
      await Promise.resolve();
      expect(fake.made[0].state).toBe('running');
    } finally {
      g.AudioContext = prevCtx;
      g.document = prevDoc;
    }
  });

  it('stays armed while the context refuses to run', async () => {
    const fake = withFakeAudio('suspended');
    const g = globalThis as Record<string, unknown>;
    const prevCtx = g.AudioContext;
    const prevDoc = g.document;
    // A resume that never takes: the listeners must not disarm, or one
    // refused gesture would silence the session permanently — which is
    // exactly how the original bug behaved.
    g.AudioContext = function () {
      return { state: 'suspended', resume: () => Promise.resolve() };
    };
    g.document = fake.doc;
    try {
      vi.resetModules();
      const { unlockAlertAudio } = await import('../alertSounds.js');
      unlockAlertAudio();
      fake.gesture();
      await Promise.resolve();
      await Promise.resolve();
      expect(fake.armed()).toBe(2);
    } finally {
      g.AudioContext = prevCtx;
      g.document = prevDoc;
    }
  });

  it('a peer plays for a window that has no gesture of its own', async () => {
    const g = globalThis as Record<string, unknown>;
    const prevCtx = g.AudioContext;
    const prevWin = g.window;
    // Main's context can never run (nobody ever clicks the launcher).
    g.AudioContext = function () {
      return { state: 'suspended', resume: () => new Promise(() => {}) };
    };
    g.window = { };
    try {
      vi.resetModules();
      const mod = await import('../alertSounds.js');
      const heard: string[] = [];
      const peer = {
        closed: false,
        raptorPlayAlertHere: (kind: string) => {
          heard.push(kind);
          return true;
        },
      } as unknown as Window;
      mod.registerAlertPeer(peer);
      mod.playAlert('tell');
      expect(heard).toEqual(['tell']);
    } finally {
      g.AudioContext = prevCtx;
      g.window = prevWin;
    }
  });

  it('forgets a peer whose window has closed', async () => {
    const g = globalThis as Record<string, unknown>;
    const prevCtx = g.AudioContext;
    const prevWin = g.window;
    g.AudioContext = function () {
      return { state: 'suspended', resume: () => new Promise(() => {}) };
    };
    g.window = { };
    try {
      vi.resetModules();
      const mod = await import('../alertSounds.js');
      const dead = { closed: true } as unknown as Window;
      const alive: string[] = [];
      mod.registerAlertPeer(dead);
      mod.registerAlertPeer({
        closed: false,
        raptorPlayAlertHere: (k: string) => {
          alive.push(k);
          return true;
        },
      } as unknown as Window);
      mod.playAlert('arrive');
      expect(alive).toEqual(['arrive']);
    } finally {
      g.AudioContext = prevCtx;
      g.window = prevWin;
    }
  });
});

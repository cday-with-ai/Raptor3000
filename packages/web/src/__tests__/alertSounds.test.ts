import { describe, it, expect } from 'vitest';
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
 * vocabulary, not four.
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

  it('each palette keeps its own oscillator wave — the mechanical half of "its own character"', () => {
    const waves = MOVE_SOUND_SETS.map(s => ALERT_RECIPES[s].tell.wave);
    expect(new Set(waves).size).toBe(MOVE_SOUND_SETS.length);
    // And a palette doesn't switch voices between kinds.
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

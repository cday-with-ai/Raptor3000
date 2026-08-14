import { ChatEventType, type ChatService } from '@raptor3000/shared';
import { loadPreferences } from './preferences.js';
import type { MoveSoundSet } from './sounds.js';

/**
 * Audible alerts for social events — an incoming person tell, a friend
 * arriving, a friend departing (Carson, 2026-08-14). Distinct from the
 * board sounds in sounds.ts in one deliberate way: these are SYNTHESIZED,
 * not sampled. Each of the four shipped sound palettes gets its own alert
 * set rendered in that palette's character — square-wave blips for Nes,
 * soft sine chimes for Piano, a filtered saw for Futuristic, dry triangle
 * taps for Sfx — so no foreign samples ride along and the licensing page
 * stays truthful. The recipes below are the whole sound: pure data, which
 * is also what makes them assertable without an AudioContext.
 *
 * Two semantic invariants the tests hold down: ARRIVE always rises and
 * DEPART always falls, in every palette — the ear should know the
 * direction of the door without learning four vocabularies. And each
 * palette keeps its own oscillator wave, which is the mechanical half of
 * "its own character".
 */

export const ALERT_KINDS = ['tell', 'arrive', 'depart'] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

export interface AlertNote {
  /** Oscillator frequency in Hz. */
  freq: number;
  /** Offset from the alert's start, seconds. */
  at: number;
  /** Sustained length before the release tail, seconds. */
  dur: number;
}

export interface AlertRecipe {
  wave: OscillatorType;
  /** Peak gain — alerts stay under the board sounds' verdict volume. */
  vol: number;
  attack: number;
  release: number;
  /** Lowpass cutoff; used to tame the sawtooth palette. */
  filterHz?: number;
  notes: readonly AlertNote[];
}

// Note names for the reader; the numbers are what plays.
const G4 = 392.0;
const B4 = 493.88;
const C5 = 523.25;
const D5 = 587.33;
const E5 = 659.25;
const F5 = 698.46;
const G5 = 783.99;
const A5 = 880.0;
const C6 = 1046.5;

export const ALERT_RECIPES: Record<
  MoveSoundSet,
  Record<AlertKind, AlertRecipe>
> = {
  piano: {
    tell: {
      wave: 'sine', vol: 0.35, attack: 0.005, release: 0.3,
      notes: [
        { freq: E5, at: 0, dur: 0.12 },
        { freq: G5, at: 0.14, dur: 0.18 },
      ],
    },
    arrive: {
      wave: 'sine', vol: 0.35, attack: 0.005, release: 0.3,
      notes: [
        { freq: C5, at: 0, dur: 0.1 },
        { freq: E5, at: 0.12, dur: 0.1 },
        { freq: G5, at: 0.24, dur: 0.22 },
      ],
    },
    depart: {
      wave: 'sine', vol: 0.35, attack: 0.005, release: 0.3,
      notes: [
        { freq: G5, at: 0, dur: 0.1 },
        { freq: E5, at: 0.12, dur: 0.1 },
        { freq: C5, at: 0.24, dur: 0.26 },
      ],
    },
  },
  nes: {
    tell: {
      wave: 'square', vol: 0.18, attack: 0.002, release: 0.04,
      notes: [
        { freq: A5, at: 0, dur: 0.06 },
        { freq: C6, at: 0.09, dur: 0.09 },
      ],
    },
    arrive: {
      wave: 'square', vol: 0.18, attack: 0.002, release: 0.04,
      notes: [
        { freq: C5, at: 0, dur: 0.05 },
        { freq: E5, at: 0.07, dur: 0.05 },
        { freq: G5, at: 0.14, dur: 0.05 },
        { freq: C6, at: 0.21, dur: 0.1 },
      ],
    },
    depart: {
      wave: 'square', vol: 0.18, attack: 0.002, release: 0.04,
      notes: [
        { freq: C6, at: 0, dur: 0.05 },
        { freq: G5, at: 0.07, dur: 0.05 },
        { freq: E5, at: 0.14, dur: 0.05 },
        { freq: C5, at: 0.21, dur: 0.12 },
      ],
    },
  },
  futuristic: {
    tell: {
      wave: 'sawtooth', vol: 0.22, attack: 0.01, release: 0.12, filterHz: 2200,
      notes: [
        { freq: B4, at: 0, dur: 0.07 },
        { freq: F5, at: 0.1, dur: 0.16 },
      ],
    },
    arrive: {
      wave: 'sawtooth', vol: 0.22, attack: 0.01, release: 0.12, filterHz: 2200,
      notes: [
        { freq: G4, at: 0, dur: 0.07 },
        { freq: D5, at: 0.09, dur: 0.07 },
        { freq: A5, at: 0.18, dur: 0.2 },
      ],
    },
    depart: {
      wave: 'sawtooth', vol: 0.22, attack: 0.01, release: 0.12, filterHz: 2200,
      notes: [
        { freq: A5, at: 0, dur: 0.07 },
        { freq: D5, at: 0.09, dur: 0.07 },
        { freq: G4, at: 0.18, dur: 0.22 },
      ],
    },
  },
  sfx: {
    tell: {
      // Two same-pitch taps: a knock on the door, which is what a tell is.
      wave: 'triangle', vol: 0.4, attack: 0.004, release: 0.08,
      notes: [
        { freq: D5, at: 0, dur: 0.05 },
        { freq: D5, at: 0.12, dur: 0.05 },
      ],
    },
    arrive: {
      wave: 'triangle', vol: 0.4, attack: 0.004, release: 0.08,
      notes: [
        { freq: G4, at: 0, dur: 0.06 },
        { freq: D5, at: 0.12, dur: 0.08 },
      ],
    },
    depart: {
      wave: 'triangle', vol: 0.4, attack: 0.004, release: 0.08,
      notes: [
        { freq: D5, at: 0, dur: 0.06 },
        { freq: G4, at: 0.12, dur: 0.08 },
      ],
    },
  },
};

/**
 * Which chat events deserve an alert. Partner tells count as tells —
 * a partner is a person talking to you, with more urgency, not less.
 * Everything else (channels, shouts, kibitzes, bot qtells) is ambient
 * and stays silent; this list is the whole opt-in.
 */
export function alertKindFor(type: ChatEventType): AlertKind | null {
  switch (type) {
    case ChatEventType.TELL:
    case ChatEventType.PARTNER_TELL:
      return 'tell';
    case ChatEventType.NOTIFICATION_ARRIVAL:
      return 'arrive';
    case ChatEventType.NOTIFICATION_DEPARTURE:
      return 'depart';
    default:
      return null;
  }
}

// One AudioContext per window, created on first play. Alerts fire only
// in the MAIN window (see installAlertSounds), which is where the user's
// gestures land — but they may fire BEFORE the first gesture (auto-login,
// tells on connect), which is what the suspended branch below handles.
let ctx: AudioContext | null = null;

/** Render a recipe in this window. Safe to call anywhere; silently a
 *  no-op where WebAudio is missing (node) or the context can't run. */
export function playAlert(kind: AlertKind, set?: MoveSoundSet): void {
  if (typeof AudioContext === 'undefined') return;
  const recipe = ALERT_RECIPES[set ?? loadPreferences().moveSoundSet][kind];
  try {
    ctx ??= new AudioContext();
    const audio = ctx;
    if (audio.state === 'running') {
      schedule(audio, recipe);
      return;
    }
    // Suspended = no user activation yet (alerts fire from network
    // events, which carry no gesture). Never schedule against a
    // suspended context: currentTime is frozen, so queued notes would
    // all fire in one burst at the user's first click. resume() resolves
    // once activation exists — play then, but only if this alert is
    // still fresh; a pile of stale alerts released by one click is worse
    // than silence.
    const asked = Date.now();
    void audio
      .resume()
      .then(() => {
        if (Date.now() - asked < 1500) schedule(audio, recipe);
      })
      .catch(() => {});
  } catch {
    // No audio is never an error worth surfacing.
  }
}

function schedule(audio: AudioContext, recipe: AlertRecipe): void {
  try {
    const t0 = audio.currentTime + 0.02;
    for (const n of recipe.notes) {
      const osc = audio.createOscillator();
      osc.type = recipe.wave;
      osc.frequency.value = n.freq;
      const gain = audio.createGain();
      gain.gain.setValueAtTime(0, t0 + n.at);
      gain.gain.linearRampToValueAtTime(recipe.vol, t0 + n.at + recipe.attack);
      gain.gain.setValueAtTime(recipe.vol, t0 + n.at + n.dur);
      gain.gain.linearRampToValueAtTime(0, t0 + n.at + n.dur + recipe.release);
      let head: AudioNode = osc;
      if (recipe.filterHz) {
        const lp = audio.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = recipe.filterHz;
        head.connect(lp);
        head = lp;
      }
      head.connect(gain);
      gain.connect(audio.destination);
      osc.start(t0 + n.at);
      osc.stop(t0 + n.at + n.dur + recipe.release + 0.02);
    }
  } catch {
    // No audio is never an error worth surfacing.
  }
}

export interface AlertDeps {
  prefs: () => { soundMode: 'on' | 'off'; alertSounds: 'on' | 'off' };
  play: (kind: AlertKind) => void;
}

/**
 * Subscribe the alert player to the chat bus. Registered as a MAIN
 * CONSOLE (fallback) listener on purpose: a specific listener that
 * accepts an event flips ChatService's consumedBySpecific and can change
 * where OTHER listeners see it, whereas a fallback listener hears
 * everything without touching routing. The fallback path also delivers
 * unconsumed events unconditionally — accepts() notwithstanding — which
 * is why handle() re-derives the kind and returns on null instead of
 * trusting accepts() to have filtered.
 *
 * Main window only (createContext wires it there): popups never install
 * this, so one event is one sound.
 */
export function installAlertSounds(
  chat: ChatService,
  deps: AlertDeps = {
    prefs: () => loadPreferences(),
    play: kind => playAlert(kind),
  },
): () => void {
  const id = 'alert-sounds';
  chat.addMainConsoleListener({
    id,
    accepts: e => alertKindFor(e.type) !== null,
    handle: e => {
      const kind = alertKindFor(e.type);
      if (!kind) return;
      const p = deps.prefs();
      if (p.soundMode !== 'on' || p.alertSounds !== 'on') return;
      deps.play(kind);
    },
  });
  return () => chat.removeListener(id);
}

import { ChatEventType, type ChatService } from '@raptor3000/shared';
import { loadPreferences } from './preferences.js';
import type { MoveSoundSet } from './sounds.js';

/**
 * Audible alerts for social events — an incoming person tell, a friend
 * arriving, a friend departing (Carson, 2026-08-14). Distinct from the
 * board sounds in sounds.ts in one deliberate way: these are SYNTHESIZED,
 * not sampled. Each shipped sound palette gets its own alert set rendered
 * in that palette's character — square-wave blips for Nes, soft sine
 * chimes for Piano, a filtered saw for Futuristic, dry triangle taps for
 * Sfx, and quieter/darker cousins for the original palettes — so no
 * foreign samples ride along and the licensing page stays truthful. The
 * recipes below are the whole sound: pure data, which is also what makes
 * them assertable without an AudioContext.
 *
 * Two semantic invariants the tests hold down: ARRIVE always rises and
 * DEPART always falls, in every palette — the ear should know the
 * direction of the door without learning ten vocabularies. And each
 * palette keeps one oscillator wave across its kinds, so a tell and an
 * arrival still sound like the same house.
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
  felt: {
    tell: {
      wave: 'sine', vol: 0.22, attack: 0.008, release: 0.22, filterHz: 1500,
      notes: [
        { freq: 329.63, at: 0, dur: 0.1 },
        { freq: 392.0, at: 0.12, dur: 0.16 },
      ],
    },
    arrive: {
      wave: 'sine', vol: 0.22, attack: 0.008, release: 0.22, filterHz: 1500,
      notes: [
        { freq: 261.63, at: 0, dur: 0.09 },
        { freq: 329.63, at: 0.11, dur: 0.09 },
        { freq: 392.0, at: 0.22, dur: 0.18 },
      ],
    },
    depart: {
      wave: 'sine', vol: 0.22, attack: 0.008, release: 0.22, filterHz: 1500,
      notes: [
        { freq: 392.0, at: 0, dur: 0.09 },
        { freq: 329.63, at: 0.11, dur: 0.09 },
        { freq: 261.63, at: 0.22, dur: 0.2 },
      ],
    },
  },
  walnut: {
    tell: {
      wave: 'triangle', vol: 0.26, attack: 0.004, release: 0.09,
      notes: [
        { freq: G4, at: 0, dur: 0.05 },
        { freq: D5, at: 0.1, dur: 0.08 },
      ],
    },
    arrive: {
      wave: 'triangle', vol: 0.26, attack: 0.004, release: 0.09,
      notes: [
        { freq: G4, at: 0, dur: 0.05 },
        { freq: B4, at: 0.08, dur: 0.05 },
        { freq: D5, at: 0.16, dur: 0.1 },
      ],
    },
    depart: {
      wave: 'triangle', vol: 0.26, attack: 0.004, release: 0.09,
      notes: [
        { freq: D5, at: 0, dur: 0.05 },
        { freq: B4, at: 0.08, dur: 0.05 },
        { freq: G4, at: 0.16, dur: 0.11 },
      ],
    },
  },
  marble: {
    tell: {
      wave: 'sine', vol: 0.18, attack: 0.002, release: 0.07,
      notes: [
        { freq: A5, at: 0, dur: 0.05 },
        { freq: 1318.5, at: 0.08, dur: 0.07 },
      ],
    },
    arrive: {
      wave: 'sine', vol: 0.18, attack: 0.002, release: 0.07,
      notes: [
        { freq: E5, at: 0, dur: 0.04 },
        { freq: A5, at: 0.07, dur: 0.04 },
        { freq: 1318.5, at: 0.14, dur: 0.08 },
      ],
    },
    depart: {
      wave: 'sine', vol: 0.18, attack: 0.002, release: 0.07,
      notes: [
        { freq: 1318.5, at: 0, dur: 0.04 },
        { freq: A5, at: 0.07, dur: 0.04 },
        { freq: E5, at: 0.14, dur: 0.09 },
      ],
    },
  },
  clock: {
    tell: {
      wave: 'square', vol: 0.12, attack: 0.002, release: 0.035, filterHz: 2400,
      notes: [
        { freq: 440.0, at: 0, dur: 0.04 },
        { freq: 660.0, at: 0.08, dur: 0.05 },
      ],
    },
    arrive: {
      wave: 'square', vol: 0.12, attack: 0.002, release: 0.035, filterHz: 2400,
      notes: [
        { freq: 330.0, at: 0, dur: 0.035 },
        { freq: 440.0, at: 0.06, dur: 0.035 },
        { freq: 550.0, at: 0.12, dur: 0.06 },
      ],
    },
    depart: {
      wave: 'square', vol: 0.12, attack: 0.002, release: 0.035, filterHz: 2400,
      notes: [
        { freq: 550.0, at: 0, dur: 0.035 },
        { freq: 440.0, at: 0.06, dur: 0.035 },
        { freq: 330.0, at: 0.12, dur: 0.07 },
      ],
    },
  },
  study: {
    tell: {
      wave: 'sine', vol: 0.14, attack: 0.012, release: 0.32,
      notes: [
        { freq: 220.0, at: 0, dur: 0.12 },
        { freq: 261.63, at: 0.14, dur: 0.18 },
      ],
    },
    arrive: {
      wave: 'sine', vol: 0.14, attack: 0.012, release: 0.32,
      notes: [
        { freq: 196.0, at: 0, dur: 0.1 },
        { freq: 261.63, at: 0.12, dur: 0.1 },
        { freq: 329.63, at: 0.24, dur: 0.2 },
      ],
    },
    depart: {
      wave: 'sine', vol: 0.14, attack: 0.012, release: 0.32,
      notes: [
        { freq: 329.63, at: 0, dur: 0.1 },
        { freq: 261.63, at: 0.12, dur: 0.1 },
        { freq: 196.0, at: 0.24, dur: 0.22 },
      ],
    },
  },
  slate: {
    tell: {
      wave: 'triangle', vol: 0.22, attack: 0.006, release: 0.16, filterHz: 1100,
      notes: [
        { freq: 196.0, at: 0, dur: 0.08 },
        { freq: 293.66, at: 0.12, dur: 0.12 },
      ],
    },
    arrive: {
      wave: 'triangle', vol: 0.22, attack: 0.006, release: 0.16, filterHz: 1100,
      notes: [
        { freq: 146.83, at: 0, dur: 0.08 },
        { freq: 196.0, at: 0.1, dur: 0.08 },
        { freq: 293.66, at: 0.2, dur: 0.14 },
      ],
    },
    depart: {
      wave: 'triangle', vol: 0.22, attack: 0.006, release: 0.16, filterHz: 1100,
      notes: [
        { freq: 293.66, at: 0, dur: 0.08 },
        { freq: 196.0, at: 0.1, dur: 0.08 },
        { freq: 146.83, at: 0.2, dur: 0.16 },
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

// One AudioContext per window, created on first play — or, better, on
// this document's first real gesture (see unlockAlertAudio).
//
// The old comment here claimed the main window "is where the user's
// gestures land". That was the bug (Carson, four reports on 2026-08-14:
// "i told myself something and didnt hear a sound"). After login the main
// window is an options/help page nobody touches again — the playing and
// chatting happen in popups, which are separate documents whose gestures
// do this one no good. So the context was built lazily from a network
// event, started `suspended`, and `resume()` sat unresolved forever
// because Chrome wants CURRENT activation, not the click made at login.
// The 1500ms freshness guard below then discarded the alert. Silence, by
// construction, for the whole session.
//
// Move sounds escaped it twice over: they use <audio>, which one gesture
// unlocks for the document's lifetime, and sounds.ts relays to the opener
// when a popup has none. Options → Preview worked because pressing it IS
// the gesture. Every symptom in the reports follows from that one line.
let ctx: AudioContext | null = null;

/**
 * Build (or resume) this document's AudioContext on its first real user
 * gesture, which is the only moment a browser will let one start.
 *
 * Idempotent, and it stays armed until the context is actually running:
 * `resume()` can be refused, and there is no signal for that beyond the
 * state. Capture-phase listeners so a stopPropagation somewhere in the
 * tree cannot starve it. `main.tsx` calls this once per document.
 */
export function unlockAlertAudio(): () => void {
  if (typeof AudioContext === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }
  const attempt = () => {
    try {
      ctx ??= new AudioContext();
      if (ctx.state === 'running') {
        off();
        return;
      }
      // We are inside a gesture here, so this resume is the one that works.
      void ctx.resume().then(() => {
        if (ctx?.state === 'running') off();
      }).catch(() => {});
    } catch {
      // No audio in this environment; nothing to arm.
    }
  };
  const off = () => {
    document.removeEventListener('pointerdown', attempt, true);
    document.removeEventListener('keydown', attempt, true);
  };
  document.addEventListener('pointerdown', attempt, true);
  document.addEventListener('keydown', attempt, true);
  return off;
}

/**
 * Windows that can speak for this one. A popup registers itself with its
 * opener on load, so the main window — which owns the alert subscription
 * but may never be clicked when auto-login is on — can hand a sound to
 * the chat window, where the user's fingers actually are. The mirror
 * image of sounds.ts's opener relay, pointing the other way.
 */
const peers = new Set<Window>();

export function registerAlertPeer(w: Window): () => void {
  peers.add(w);
  return () => peers.delete(w);
}

/** Ask a window that has activation to play this for us. */
function relayToPeer(kind: AlertKind, set?: MoveSoundSet): boolean {
  for (const w of [...peers]) {
    try {
      if (w.closed) {
        peers.delete(w);
        continue;
      }
      if (w.raptorPlayAlertHere?.(kind, set)) return true;
    } catch {
      // Cross-origin or half-dead peer: drop it and try the next.
      peers.delete(w);
    }
  }
  return false;
}

/**
 * Play here if this document's context is running. Returns whether it
 * did, so a caller can try somewhere else. Exposed on `window` so the
 * opener can reach into a popup.
 */
function playAlertHere(kind: AlertKind, set?: MoveSoundSet): boolean {
  if (typeof AudioContext === 'undefined') return false;
  try {
    if (!ctx || ctx.state !== 'running') return false;
    schedule(ctx, ALERT_RECIPES[set ?? loadPreferences().moveSoundSet][kind]);
    return true;
  } catch {
    return false;
  }
}

declare global {
  interface Window {
    /** Cross-window alert relay; every window running the bundle registers
     *  its own. Returns false when this document's context can't sound. */
    raptorPlayAlertHere?: (kind: AlertKind, set?: MoveSoundSet) => boolean;
  }
}
if (typeof window !== 'undefined') window.raptorPlayAlertHere = playAlertHere;

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
    // Suspended here and no gesture to lean on. A popup may have one —
    // with auto-login the main window can go a whole session untouched
    // while the user types happily in the chat window.
    if (relayToPeer(kind, set)) return;
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

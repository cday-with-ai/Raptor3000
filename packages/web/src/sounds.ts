import { GameEndType, type GameEndMessage } from '@raptor3000/shared';
import { loadPreferences } from './preferences.js';

/**
 * Board sounds (Carson, 2026-08-12): "move sound, capture sound, game
 * start, game end, observe start ends etc. subtle."
 *
 * Six original palettes (Felt, Walnut, Marble, Clock, Study, Slate)
 * ship the full board language — move, capture, check, notify, and the
 * four endings. The four free lichess/Enigmahack sets (AGPLv3+:
 * futuristic, nes, piano, sfx) stay available; those only have
 * move/capture/check (piano has the endings too), so a verdict on sfx /
 * futuristic / nes still falls back to piano. The famous "standard"
 * lichess sounds are in lila's COPYING.md "Exceptions (non-free)" list
 * and do not ship. Attribution is on the licensing page.
 *
 * Every play is gated on the existing soundMode preference and wrapped
 * against autoplay policy: a popup the user hasn't touched yet may
 * reject play() — that's fine, the game is not louder than the browser
 * allows.
 */
export type SoundName =
  | 'move'
  | 'capture'
  | 'check'
  | 'notify'   // session begins: your game, an observe, an examine
  | 'victory'
  | 'defeat'
  | 'draw'
  | 'explosion'; // the boom end-show's extra

/** Original palettes — full board language, physical, no tunes. */
export const ORIGINAL_SOUND_SETS = [
  'felt',
  'walnut',
  'marble',
  'clock',
  'study',
  'slate',
] as const;

/** The free Enigmahack sets that still ship (AGPLv3+, see the notices). */
export const LEGACY_SOUND_SETS = ['sfx', 'piano', 'futuristic', 'nes'] as const;

export const MOVE_SOUND_SETS = [
  ...ORIGINAL_SOUND_SETS,
  ...LEGACY_SOUND_SETS,
] as const;
export type MoveSoundSet = (typeof MOVE_SOUND_SETS)[number];

export const MOVE_SOUND_SET_LABELS: Record<MoveSoundSet, string> = {
  felt: 'Felt',
  walnut: 'Walnut',
  marble: 'Marble',
  clock: 'Clock',
  study: 'Study',
  slate: 'Slate',
  sfx: 'Sfx',
  piano: 'Piano',
  futuristic: 'Futuristic',
  nes: 'Nes (8-bit)',
};

/** Sets that have notify + verdict + explosion samples of their own. */
const FULL_BOARD_SETS: ReadonlySet<MoveSoundSet> = new Set([
  ...ORIGINAL_SOUND_SETS,
  'piano',
]);

const MOVE_CLASS: ReadonlySet<SoundName> = new Set(['move', 'capture', 'check']);

const FILES: Record<SoundName, string> = {
  move: 'Move',
  capture: 'Capture',
  check: 'Check',
  notify: 'GenericNotify',
  victory: 'Victory',
  defeat: 'Defeat',
  draw: 'Draw',
  explosion: 'Explosion',
};

// Subtle: moves whisper, verdicts speak.
const VOLUME: Record<SoundName, number> = {
  move: 0.4,
  capture: 0.45,
  check: 0.45,
  notify: 0.35,
  victory: 0.6,
  defeat: 0.6,
  draw: 0.6,
  explosion: 0.65,
};

// Verdicts sit a step deeper than the moves — the piano notes sound
// thin at their natural pitch (Carson, 2026-08-18). playbackRate below
// 1 drops the pitch, and a lowered note lasts a touch longer, which
// suits a verdict; the nuke boom goes deepest.
const PITCH: Record<SoundName, number> = {
  move: 1,
  capture: 1,
  check: 1,
  notify: 1,
  victory: 0.85,
  defeat: 0.85,
  draw: 0.85,
  explosion: 0.7,
};

/** Which folder a sound plays from. Moves follow the preference;
 *  endings use that same folder when it has them, else piano. */
export function setForSound(name: SoundName, moveSet: MoveSoundSet): MoveSoundSet {
  if (MOVE_CLASS.has(name) || FULL_BOARD_SETS.has(moveSet)) return moveSet;
  return 'piano';
}

/** Which sound a just-played SAN deserves; null for "none played". */
export function soundForSan(san: string): SoundName | null {
  if (!san || san === 'none') return null;
  if (san.includes('#') || san.includes('+')) return 'check';
  if (san.includes('x')) return 'capture';
  return 'move';
}

/**
 * The game-over sound. A player hears their verdict; everyone else
 * (observers, examiners) gets the subtle notify.
 */
export function gameEndSound(
  end: GameEndMessage,
  loggedInAs: string | null,
): SoundName {
  // Aborted/adjourned/unknown endings are nobody's victory — the old
  // fallthrough handed black a Victory chord for an aborted game.
  if (
    end.type !== GameEndType.WHITE_WON &&
    end.type !== GameEndType.BLACK_WON &&
    end.type !== GameEndType.DRAW
  ) {
    return 'notify';
  }
  const me = loggedInAs?.toLowerCase();
  const isWhite = me === end.whiteName.toLowerCase();
  const isBlack = me === end.blackName.toLowerCase();
  if (!me || (!isWhite && !isBlack)) return 'notify';
  if (end.type === GameEndType.DRAW) return 'draw';
  const iWon =
    (end.type === GameEndType.WHITE_WON) === isWhite;
  return iWon ? 'victory' : 'defeat';
}

// One Audio per sound per window, created lazily and re-used — the
// browser caches the fetch, currentTime rewinds for rapid replays.
const cache = new Map<string, HTMLAudioElement>();

/** Play in THIS window's document; rejects under autoplay policy. */
function playHere(name: SoundName): Promise<void> {
  const set = setForSound(name, loadPreferences().moveSoundSet);
  const key = `${set}/${name}`;
  let a = cache.get(key);
  if (!a) {
    a = new Audio(`/sound/${set}/${FILES[name]}.mp3`);
    cache.set(key, a);
  }
  a.volume = VOLUME[name];
  // Piano verdicts were pitched down because the notes sounded thin
  // (Carson, 2026-08-18). The original palettes are physical taps —
  // slowing them just makes a thud last too long.
  a.playbackRate = set === 'piano' ? PITCH[name] : 1;
  a.currentTime = 0;
  return a.play();
}

declare global {
  interface Window {
    /** Cross-window sound relay; every window running the bundle registers its own. */
    raptorPlaySound?: (name: SoundName) => Promise<void>;
  }
}
if (typeof window !== 'undefined') window.raptorPlaySound = playHere;

export function playSound(name: SoundName): void {
  if (loadPreferences().soundMode !== 'on') return;
  if (typeof Audio === 'undefined') return; // node tests
  void playHere(name).catch(() => {
    // Autoplay policy: no gesture in THIS window yet — which is every
    // observed board, watched but never clicked. The main window holds
    // the user's gestures (login, commands), so relay the note to the
    // opener and let it speak for the popup.
    try {
      const opener = window.opener as Window | null;
      if (opener && !opener.closed) {
        void opener.raptorPlaySound?.(name).catch(() => {
          // The opener has no gesture either. Stay silent, as before.
        });
      }
    } catch {
      // Cross-origin or half-dead opener: stay silent, as before.
    }
  });
}

import { GameEndType, type GameEndMessage } from '@raptor3000/shared';
import { loadPreferences } from './preferences.js';

/**
 * Board sounds (Carson, 2026-08-12): "move sound, capture sound, game
 * start, game end, observe start ends etc. subtle."
 *
 * The set is lichess's PIANO set by Enigmahack — soft single notes, the
 * most subtle of the four lila sound sets that are actually free
 * (AGPLv3+: futuristic, nes, piano, sfx). The famous "standard" lichess
 * sounds are in lila's COPYING.md "Exceptions (non-free)" list, so they
 * can't come along. Attribution ships with the licensing page.
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
  | 'draw';

const FILES: Record<SoundName, string> = {
  move: 'Move',
  capture: 'Capture',
  check: 'Check',
  notify: 'GenericNotify',
  victory: 'Victory',
  defeat: 'Defeat',
  draw: 'Draw',
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
};

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
const cache = new Map<SoundName, HTMLAudioElement>();

/** Play in THIS window's document; rejects under autoplay policy. */
function playHere(name: SoundName): Promise<void> {
  let a = cache.get(name);
  if (!a) {
    a = new Audio(`/sound/piano/${FILES[name]}.mp3`);
    cache.set(name, a);
  }
  a.volume = VOLUME[name];
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

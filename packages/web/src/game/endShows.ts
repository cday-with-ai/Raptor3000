import { GameEndType, type GameEndMessage } from '@raptor3000/shared';
import type { SoundName } from '../sounds.js';

/**
 * Game-end theater (Carson, 2026-08-12, after winning his
 * first game on it: "add some random stuff to it and make it
 * interesting like exploding king mating piece does some animation
 * things like that get creative" — and "the sounds are also good at
 * the end but randomize them with the animation").
 *
 * A SHOW pairs the king animations with an optional extra sound; one
 * show is picked per game, deterministically from the gameId, so every
 * window watching the same game sees the same performance. Shows only
 * run for decisive results and draws — aborted/adjourned games get no
 * theater at all (Carson: "you dont have to do anything really").
 */
export interface EndShow {
  readonly key: string;
  /** CSS animation shorthand for the winning king. */
  readonly winner: string;
  /** …the losing king… */
  readonly loser: string;
  /** …and both kings on a draw. */
  readonly draw: string;
  /** Played alongside the verdict sound. */
  readonly extraSound?: SoundName;
  /** For mate endings: the piece that delivered it gets this. */
  readonly materAnim?: string;
  /** Whole-team shows: every non-king piece performs too. */
  readonly teamWinnerAnim?: string;
  readonly teamLoserAnim?: string;
  /** Show only makes sense when a mate was actually delivered. */
  readonly requiresMate?: boolean;
}

// Season three (Carson, 2026-08-18): "still gay" — the bow and the
// floaty dance went; winners pump — a hard double-stomp with a
// snapping landing — and the boom show vaporizes the loser in a
// burst of light instead of wobbling him off the board.
const PUMP = 'raptor-king-pump 1.1s cubic-bezier(0.34, 1.56, 0.64, 1) 2';
const TOPPLE = 'raptor-king-topple 0.9s cubic-bezier(0.55, 0, 1, 0.45) forwards';
const VAPORIZE = 'raptor-king-vaporize 0.6s ease-in forwards';

export const END_SHOWS: readonly EndShow[] = [
  // The winner pumps his fist; the loser's king takes the fall.
  { key: 'classic', winner: PUMP, loser: TOPPLE, draw: PUMP },
  // The nuke: the losing king is erased in a burst of light.
  {
    key: 'boom',
    winner: PUMP,
    loser: VAPORIZE,
    draw: PUMP,
    extraSound: 'explosion',
  },
  // The mating piece takes the spotlight; the kings play it straight.
  {
    key: 'mate-spin',
    winner: PUMP,
    loser: TOPPLE,
    draw: PUMP,
    materAnim: 'raptor-mater-spin 1.3s ease-in-out 2',
    requiresMate: true,
  },
  // The whole winning side pumps as one; the losers droop (Carson:
  // "all the pieces celebrate on the winning team the other pieces
  // look sad"). Staggered per square by the renderer.
  {
    key: 'team',
    winner: PUMP,
    loser: TOPPLE,
    draw: PUMP,
    teamWinnerAnim: 'raptor-team-pump 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 3',
    teamLoserAnim: 'raptor-team-droop 1.4s ease-in forwards',
  },
];

function isDecisiveOrDraw(type: GameEndMessage['type']): boolean {
  return (
    type === GameEndType.WHITE_WON ||
    type === GameEndType.BLACK_WON ||
    type === GameEndType.DRAW
  );
}

/**
 * The show for this game, or null when the ending earns none
 * (aborted, adjourned, unknown). No Math.random: same gameId, same
 * show, in every window.
 */
export function endShowFor(
  ge: GameEndMessage,
  mateDelivered: boolean,
): EndShow | null {
  if (!isDecisiveOrDraw(ge.type)) return null;
  const pool = END_SHOWS.filter(s => !s.requiresMate || mateDelivered);
  let hash = 7;
  for (const ch of ge.gameId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return pool[hash % pool.length];
}

/** What a non-king team member does, or null when this show (or a
 *  draw — no team won) keeps the spotlight on the kings. */
export function teamShowAnimation(
  show: EndShow,
  ge: GameEndMessage,
  whitePiece: boolean,
): string | null {
  if (ge.type === GameEndType.DRAW) return null;
  const winnerIsWhite = ge.type === GameEndType.WHITE_WON;
  return (whitePiece === winnerIsWhite ? show.teamWinnerAnim : show.teamLoserAnim) ?? null;
}

/** What this king does in this show, given who won. */
export function kingShowAnimation(
  show: EndShow,
  ge: GameEndMessage,
  whiteKing: boolean,
): string {
  if (ge.type === GameEndType.DRAW) return show.draw;
  const winnerIsWhite = ge.type === GameEndType.WHITE_WON;
  return whiteKing === winnerIsWhite ? show.winner : show.loser;
}

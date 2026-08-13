import { GameEndType, type GameEndMessage } from '@raptor3000/shared';
import type { SoundName } from '../sounds.js';

/**
 * Game-end theater, season two (Carson, 2026-08-12, after winning his
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

const DANCE = 'raptor-king-dance 1.4s ease-in-out 2';
const BOW = 'raptor-king-bow 1.4s ease-in-out 2';
const TOPPLE = 'raptor-king-topple 1.2s ease-in forwards';

export const END_SHOWS: readonly EndShow[] = [
  // The original cast.
  { key: 'classic', winner: DANCE, loser: TOPPLE, draw: BOW },
  // The loser goes out with a bang; the winner hops in place.
  {
    key: 'boom',
    winner: 'raptor-king-hop 0.6s ease-in-out 3',
    loser: 'raptor-king-explode 1.1s ease-out forwards',
    draw: BOW,
    extraSound: 'explosion',
  },
  // The mating piece takes the spotlight; the kings play it straight.
  {
    key: 'mate-spin',
    winner: DANCE,
    loser: TOPPLE,
    draw: BOW,
    materAnim: 'raptor-mater-spin 1.3s ease-in-out 2',
    requiresMate: true,
  },
  // Gentlemen's finish.
  { key: 'bows', winner: BOW, loser: TOPPLE, draw: 'raptor-mater-spin 1.3s ease-in-out 1' },
  // The whole team celebrates; the other team can't watch (Carson:
  // "all the pieces celebrate on the winning team the other pieces
  // look sad"). Staggered per square by the renderer.
  {
    key: 'team',
    winner: DANCE,
    loser: TOPPLE,
    draw: BOW,
    teamWinnerAnim: 'raptor-team-cheer 0.9s ease-in-out 3',
    teamLoserAnim: 'raptor-team-droop 1.6s ease-in forwards',
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

/**
 * Game state bitmask flags, at exact parity with Raptor's Game.java constants
 * (lines 30-101 in the source). These are OR-able flags, not mutually
 * exclusive enum values — a single game's state field is a bitmask.
 *
 * Source: /tmp/raptor/raptor/src/raptor/chess/Game.java
 */
export const GameState = {
  /** Game is actively being played. */
  ACTIVE: 1 << 0,

  /** Game no longer being played. */
  INACTIVE: 1 << 1,

  /** Game is in examined state. */
  EXAMINING: 1 << 2,

  /** User is playing the game (as opposed to observing/examining). */
  PLAYING: 1 << 3,

  /** Game is not timed. */
  UNTIMED: 1 << 4,

  /** Droppable game (crazyhouse, bughouse). Implies UNTIMED is irrelevant. */
  DROPPABLE: 1 << 5,

  /** The color-to-move's clock is currently ticking. */
  IS_CLOCK_TICKING: 1 << 6,

  /** Observing an examined game (not just a live game). */
  OBSERVING_EXAMINED: 1 << 7,

  /** Observation state. */
  OBSERVING: 1 << 8,

  /** Position is being set up (`bsetup` mode). */
  SETUP: 1 << 9,

  /** Updating ECO headers. Engines should disable this to avoid thrashing. */
  UPDATING_ECO_HEADERS: 1 << 10,

  /** Updating SAN on moves as made. Engines should disable this. */
  UPDATING_SAN: 1 << 11,

  /** Fischer Random castling rules (FR, FR zh, FR bughouse). */
  FISCHER_RANDOM: 1 << 12,
} as const;

export type GameStateFlag = typeof GameState[keyof typeof GameState];

export function has(state: number, flag: GameStateFlag): boolean {
  return (state & flag) !== 0;
}

export function setFlag(state: number, flag: GameStateFlag): number {
  return state | flag;
}

export function clearFlag(state: number, flag: GameStateFlag): number {
  return state & ~flag;
}

export function describeState(state: number): string {
  const parts: string[] = [];
  for (const [name, flag] of Object.entries(GameState)) {
    if (has(state, flag as GameStateFlag)) parts.push(name);
  }
  return parts.join(' | ') || '(none)';
}

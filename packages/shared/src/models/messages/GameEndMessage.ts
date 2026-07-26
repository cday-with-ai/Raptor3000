/**
 * Game-end notification. Parity with
 * raptor/connector/ics/game/message/GameEndMessage.java.
 */

/** Result type constants — exact values from Raptor. */
export const GameEndType = {
  WHITE_WON: 0,
  BLACK_WON: 1,
  DRAW: 2,
  ADJOURNED: 3,
  ABORTED: 4,
  UNDETERMINED: 5,
} as const;
export type GameEndTypeCode = typeof GameEndType[keyof typeof GameEndType];

export interface GameEndMessage {
  readonly gameId: string;
  readonly whiteName: string;
  readonly blackName: string;
  readonly type: GameEndTypeCode;

  /** Human-readable result description from the server, e.g. "Black resigns". */
  readonly description: string;
}

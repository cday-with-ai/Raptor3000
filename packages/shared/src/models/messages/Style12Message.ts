/**
 * FICS Style 12 board record. Sent by the server on every move and state
 * change. Parity with raptor/connector/ics/game/message/Style12Message.java.
 *
 * Format reference: https://www.freechess.org/Help/HelpFiles/style12.html
 */

/**
 * Style 12 relation codes — describes the viewer's relationship to the game.
 * Exact values from Raptor's Style12Message.java.
 */
export const Style12Relation = {
  ISOLATED_POSITION: -3,
  OBSERVING_EXAMINED_GAME: -2,
  PLAYING_OPPONENTS_MOVE: -1,
  OBSERVING_GAME: 0,
  PLAYING_MY_MOVE: 1,
  EXAMINING_GAME: 2,
} as const;
export type Style12RelationCode =
  typeof Style12Relation[keyof typeof Style12Relation];

export interface Style12Message {
  readonly gameId: string;

  /** 8×8 piece grid; position[rank][file]. Piece encoding follows Raptor's int codes. */
  readonly position: readonly (readonly number[])[];

  /** True if white is to move AFTER this update is applied. */
  readonly isWhitesMoveAfterMoveIsMade: boolean;

  /** File of the pawn that just made a double-push (for en passant), or -1. */
  readonly doublePawnPushFile: number;

  readonly canWhiteCastleKSide: boolean;
  readonly canWhiteCastleQSide: boolean;
  readonly canBlackCastleKSide: boolean;
  readonly canBlackCastleQSide: boolean;

  /** Halfmove counter since last pawn move or capture (50-move rule). */
  readonly numberOfMovesSinceLastIrreversible: number;

  readonly whiteName: string;
  readonly blackName: string;

  readonly relation: Style12RelationCode;

  /** Initial time in ms (time control). */
  readonly initialTimeMillis: number;

  /** Increment per move in ms. */
  readonly initialIncMillis: number;

  /** Whites material strength (sum of piece values). */
  readonly whiteStrength: number;
  readonly blackStrength: number;

  readonly whiteRemainingTimeMillis: number;
  readonly blackRemainingTimeMillis: number;

  /** Next move number (the move about to be played). */
  readonly fullMoveNumber: number;

  /** SAN of the move just made (or "none" for initial position). */
  readonly san: string;

  /** Long-algebraic of the move just made. */
  readonly lan: string;

  readonly timeTakenForLastMoveMillis: number;

  readonly lagInMillis: number;

  readonly isClockTicking: boolean;

  /** True if the board is being displayed flipped (user is playing black). */
  readonly isWhiteOnTop: boolean;
}

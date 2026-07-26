/**
 * `<g1>` game-start notification (FICS ivariable "gameinfo").
 *
 * Parity with raptor/connector/ics/game/message/G1Message.java. The
 * `isWhiteRegistered` / `partnerGameId` field names in the Java source
 * contain typos (`isWhtieRegistered`, `parterGameId`); we fix them here
 * and map at the parser boundary.
 */
export interface G1Message {
  readonly gameId: string;
  readonly gameTypeDescription: string;
  readonly isPrivate: boolean;
  readonly isRated: boolean;

  readonly isWhiteRegistered: boolean;
  readonly isBlackRegistered: boolean;

  /** Initial time in milliseconds (time control). */
  readonly initialWhiteTimeMillis: number;
  readonly initialBlackTimeMillis: number;

  readonly initialWhiteIncMillis: number;
  readonly initialBlackIncMillis: number;

  readonly whiteRemainingTime: number;
  readonly blackRemainingTime: number;

  readonly whiteRating: string;
  readonly blackRating: string;

  /** For bughouse, the id of the paired game (empty string if none). */
  readonly partnerGameId: string;

  readonly isWhiteUsingTimeseal: boolean;
  readonly isBlackUsingTimeseal: boolean;
}

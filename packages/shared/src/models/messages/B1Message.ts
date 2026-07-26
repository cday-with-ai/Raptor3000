/**
 * Bughouse `<b1>` piece-holdings update.
 *
 * Parity with raptor/connector/ics/game/message/B1Message.java.
 *
 * Example FICS line:
 *   <b1> game 6 white [PNBBB] black [PNB]
 *   <b1> game 6 white [PNBBB] black [PNB] <- BN   (piece passed)
 *
 * Holdings arrays are indexed by piece type; values are counts of that
 * piece currently in that player's pool.
 */
export interface B1Message {
  readonly gameId: string;
  readonly whiteHoldings: readonly number[];
  readonly blackHoldings: readonly number[];
}

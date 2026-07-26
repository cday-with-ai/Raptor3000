/**
 * "Removing game N from observation list" notice.
 * Parity with raptor/connector/ics/game/message/RemovingObsGameMessage.java.
 */
export interface RemovingObsGameMessage {
  readonly gameId: string;
}

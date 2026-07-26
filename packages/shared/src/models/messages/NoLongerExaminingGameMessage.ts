/**
 * "You are no longer examining game N" notice.
 * Parity with raptor/connector/ics/game/message/NoLongerExaminingGameMessage.java.
 */
export interface NoLongerExaminingGameMessage {
  readonly gameId: string;
}

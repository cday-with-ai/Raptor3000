/**
 * Server illegal-move rejection.
 * Parity with raptor/connector/ics/game/message/IllegalMoveMessage.java.
 *
 * Note: Raptor's POJO has no gameId field; the server doesn't include one.
 * The parser attaches it to whatever game is active at the time.
 */
export interface IllegalMoveMessage {
  readonly move: string;
}
